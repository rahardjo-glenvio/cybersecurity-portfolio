'use strict';

const fs = require('fs');

const CHUNK_SIZE = 256 * 1024;

// alerts.json is append-ordered, so once we are past the cutoff we can stop.
// Wazuh can flush a few events slightly out of order, so require a run of
// consecutive stale lines before giving up.
const STALE_RUN_TO_STOP = 64;

/**
 * Reads the newest alerts out of a Wazuh alerts.json without shelling out.
 *
 * Walks the file backwards in chunks and stops as soon as it has enough
 * relevant alerts or has passed the time cutoff, so cost scales with the
 * window asked for, not with the size of the log.
 *
 * @param {object}   opts
 * @param {string}   opts.filePath
 * @param {number}   [opts.hours=24]           time window
 * @param {number}   [opts.maxAlerts=500]      cap on *relevant* alerts returned
 * @param {number}   [opts.maxBytesScanned]    safety bound on how far back to walk
 * @param {function} [opts.isRelevant]         (parsedAlert) => boolean
 * @returns {Promise<{alerts: object[], stats: object}>} newest-first
 */
async function readRecentAlerts({
  filePath,
  hours = 24,
  maxAlerts = 500,
  maxBytesScanned = 64 * 1024 * 1024,
  isRelevant = () => true
} = {}) {
  const started = process.hrtime.bigint();
  const stats = {
    bytesScanned: 0,
    linesScanned: 0,
    linesParsed: 0,
    parseErrors: 0,
    alertsKept: 0,
    stoppedBecause: 'start-of-file',
    readMs: 0
  };

  let handle;
  try {
    handle = await fs.promises.open(filePath, 'r');
  } catch (err) {
    stats.stoppedBecause = `open-failed: ${err.code || err.message}`;
    stats.readMs = Number(process.hrtime.bigint() - started) / 1e6;
    return { alerts: [], stats };
  }

  const alerts = [];
  const cutoff = Date.now() - hours * 3600 * 1000;

  try {
    const { size } = await handle.stat();
    let pos = size;
    // Bytes of the line straddling the chunk boundary. Held as RAW BYTES and
    // never decoded here: a multi-byte UTF-8 character split across the seam
    // would decode to U+FFFD, and re-encoding that would corrupt the line.
    let carry = Buffer.alloc(0);
    let staleRun = 0;

    outer:
    while (pos > 0) {
      if (stats.bytesScanned >= maxBytesScanned) {
        stats.stoppedBecause = 'byte-budget';
        break;
      }

      const readSize = Math.min(CHUNK_SIZE, pos);
      pos -= readSize;

      const buf = Buffer.alloc(readSize);
      await handle.read(buf, 0, readSize, pos);
      stats.bytesScanned += readSize;

      const combined = Buffer.concat([buf, carry]);

      // Split on the first newline at BYTE level. Everything before it is the
      // tail of a line that continues into the next (earlier) chunk.
      let start = 0;
      if (pos > 0) {
        const nl = combined.indexOf(0x0a);
        if (nl === -1) {
          // No line break in this whole chunk yet - keep accumulating.
          carry = combined;
          continue;
        }
        carry = Buffer.from(combined.subarray(0, nl)); // copy: release `combined`
        start = nl + 1;
      } else {
        carry = Buffer.alloc(0);
      }

      const lines = combined.subarray(start).toString('utf8').split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line || !line.trim()) continue;
        stats.linesScanned++;

        let alert;
        try {
          alert = JSON.parse(line);
          stats.linesParsed++;
        } catch {
          stats.parseErrors++;
          continue;
        }

        const ts = alert.timestamp ? Date.parse(alert.timestamp) : NaN;
        if (!Number.isNaN(ts) && ts < cutoff) {
          if (++staleRun >= STALE_RUN_TO_STOP) {
            stats.stoppedBecause = 'time-cutoff';
            break outer;
          }
          continue;
        }
        staleRun = 0;
        if (Number.isNaN(ts)) continue;

        if (!isRelevant(alert)) continue;

        alerts.push(alert);
        if (alerts.length >= maxAlerts) {
          stats.stoppedBecause = 'max-alerts';
          break outer;
        }
      }
    }
  } finally {
    await handle.close().catch(() => {});
  }

  stats.alertsKept = alerts.length;
  stats.readMs = Number(process.hrtime.bigint() - started) / 1e6;
  return { alerts, stats };
}

module.exports = { readRecentAlerts };
