"""Google dork catalog — ~120 patterns across 12 categories and 3 tiers.

Each dork is a tuple: (tier, category, query_template, finding_type, severity)
  - tier 1 = highest signal, run always
  - tier 2 = important, default on
  - tier 3 = comprehensive / noisy, default on but first to disable if too slow

Template variable: {domain} is substituted with the target domain.

References & inspiration:
  - Google Hacking Database (GHDB, Exploit-DB)
  - SecLists — Discovery/Web-Content
  - Pentester-Academy dork compilations
  - The Dork Lord / Bug Bounty recon playbooks

IMPORTANT: Dorks return *potential* exposures. Every hit requires analyst
triage. False positives are common, especially for Tier 3.
"""
from __future__ import annotations

# (tier, category, query_template, finding_type, severity)
DORKS: list[tuple[int, str, str, str, str]] = [

    # ================================================================
    # TIER 1 — CRITICAL-SIGNAL DORKS
    # ================================================================

    # --- Credentials & Secrets (plaintext in indexable files) ---
    (1, "credentials", 'site:{domain} intext:"password" filetype:txt', "credential_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"password" filetype:log', "credential_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"DB_PASSWORD"', "credential_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"AWS_SECRET_ACCESS_KEY"', "credential_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"BEGIN RSA PRIVATE KEY"', "private_key_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"BEGIN OPENSSH PRIVATE KEY"', "private_key_exposure", "critical"),
    (1, "credentials", 'site:{domain} intext:"api_key" filetype:json', "credential_exposure", "high"),
    (1, "credentials", 'site:{domain} intext:"authorization: bearer" filetype:log', "credential_exposure", "high"),

    # --- Sensitive Config Files ---
    (1, "config", 'site:{domain} filetype:env "DB_PASSWORD"', "config_exposure", "critical"),
    (1, "config", 'site:{domain} filetype:env', "config_exposure", "high"),
    (1, "config", 'site:{domain} inurl:wp-config.php', "config_exposure", "critical"),
    (1, "config", 'site:{domain} filetype:yml "password"', "config_exposure", "high"),
    (1, "config", 'site:{domain} filetype:yaml "password"', "config_exposure", "high"),
    (1, "config", 'site:{domain} filetype:ini "password"', "config_exposure", "high"),
    (1, "config", 'site:{domain} filetype:conf "password"', "config_exposure", "high"),
    (1, "config", 'site:{domain} filetype:xml "password"', "config_exposure", "medium"),
    (1, "config", 'site:{domain} inurl:web.config', "config_exposure", "medium"),
    (1, "config", 'site:{domain} inurl:configuration.php intitle:"index of"', "config_exposure", "high"),

    # --- Database Dumps / SQL ---
    (1, "database", 'site:{domain} filetype:sql "INSERT INTO"', "database_dump", "critical"),
    (1, "database", 'site:{domain} filetype:sql "CREATE TABLE"', "database_dump", "high"),
    (1, "database", 'site:{domain} filetype:sql "DROP TABLE"', "database_dump", "high"),
    (1, "database", 'site:{domain} filetype:db', "database_dump", "high"),
    (1, "database", 'site:{domain} filetype:mdb', "database_dump", "medium"),
    (1, "database", 'site:{domain} filetype:sqlite', "database_dump", "high"),

    # --- Exposed Version Control ---
    (1, "vcs", 'site:{domain} inurl:".git/"', "vcs_exposure", "critical"),
    (1, "vcs", 'site:{domain} inurl:".git/config"', "vcs_exposure", "critical"),
    (1, "vcs", 'site:{domain} inurl:".svn/"', "vcs_exposure", "high"),
    (1, "vcs", 'site:{domain} inurl:".hg/"', "vcs_exposure", "medium"),
    (1, "vcs", 'site:{domain} inurl:".DS_Store"', "vcs_exposure", "low"),

    # ================================================================
    # TIER 2 — IMPORTANT-SIGNAL DORKS
    # ================================================================

    # --- Backup Files ---
    (2, "backup", 'site:{domain} ext:bak', "backup_exposure", "high"),
    (2, "backup", 'site:{domain} ext:old', "backup_exposure", "medium"),
    (2, "backup", 'site:{domain} ext:swp', "backup_exposure", "medium"),
    (2, "backup", 'site:{domain} ext:save', "backup_exposure", "medium"),
    (2, "backup", 'site:{domain} inurl:backup filetype:zip', "backup_exposure", "high"),
    (2, "backup", 'site:{domain} inurl:backup filetype:tar', "backup_exposure", "high"),
    (2, "backup", 'site:{domain} inurl:backup filetype:sql', "backup_exposure", "critical"),
    (2, "backup", 'site:{domain} intitle:"index of" backup', "backup_exposure", "medium"),

    # --- Log Files ---
    (2, "logs", 'site:{domain} ext:log "password"', "log_leak", "high"),
    (2, "logs", 'site:{domain} ext:log "token"', "log_leak", "high"),
    (2, "logs", 'site:{domain} ext:log "error"', "log_leak", "low"),
    (2, "logs", 'site:{domain} inurl:"access.log"', "log_leak", "medium"),
    (2, "logs", 'site:{domain} inurl:"error.log"', "log_leak", "medium"),
    (2, "logs", 'site:{domain} intitle:"index of" "logs"', "log_leak", "medium"),

    # --- Admin Panels / Login Pages ---
    (2, "admin_panel", 'site:{domain} inurl:admin', "admin_panel", "low"),
    (2, "admin_panel", 'site:{domain} intitle:"admin login"', "admin_panel", "medium"),
    (2, "admin_panel", 'site:{domain} inurl:administrator', "admin_panel", "low"),
    (2, "admin_panel", 'site:{domain} inurl:login filetype:php', "admin_panel", "low"),
    (2, "admin_panel", 'site:{domain} inurl:/admin/login', "admin_panel", "medium"),
    (2, "admin_panel", 'site:{domain} inurl:dashboard', "admin_panel", "low"),

    # --- Error Messages / Stack Traces ---
    (2, "error_exposure", 'site:{domain} intext:"SQL syntax"', "error_leak", "high"),
    (2, "error_exposure", 'site:{domain} intext:"mysql_fetch_array()"', "error_leak", "high"),
    (2, "error_exposure", 'site:{domain} intext:"Warning: include("', "error_leak", "medium"),
    (2, "error_exposure", 'site:{domain} intext:"Fatal error" filetype:php', "error_leak", "medium"),
    (2, "error_exposure", 'site:{domain} intext:"Traceback (most recent call last)"', "error_leak", "medium"),
    (2, "error_exposure", 'site:{domain} intext:"ODBC Driver"', "error_leak", "medium"),

    # --- Directory Listing ---
    (2, "dir_listing", 'site:{domain} intitle:"index of /"', "directory_listing", "medium"),
    (2, "dir_listing", 'site:{domain} intitle:"index of" parent directory', "directory_listing", "medium"),
    (2, "dir_listing", 'site:{domain} intitle:"index of" "uploads"', "directory_listing", "high"),
    (2, "dir_listing", 'site:{domain} intitle:"index of" "private"', "directory_listing", "high"),

    # --- Cloud Storage Exposure ---
    (2, "cloud_storage", 'site:s3.amazonaws.com {domain}', "cloud_exposure", "high"),
    (2, "cloud_storage", 'site:blob.core.windows.net {domain}', "cloud_exposure", "high"),
    (2, "cloud_storage", 'site:storage.googleapis.com {domain}', "cloud_exposure", "high"),
    (2, "cloud_storage", 'site:digitaloceanspaces.com {domain}', "cloud_exposure", "medium"),
    (2, "cloud_storage", '"{domain}" "s3://" OR "gs://"', "cloud_exposure", "medium"),

    # --- Document Exposure (internal / confidential) ---
    (2, "document_exposure", 'site:{domain} filetype:pdf "confidential"', "document_leak", "high"),
    (2, "document_exposure", 'site:{domain} filetype:pdf "internal use only"', "document_leak", "high"),
    (2, "document_exposure", 'site:{domain} filetype:xlsx "password"', "document_leak", "high"),
    (2, "document_exposure", 'site:{domain} filetype:docx "confidential"', "document_leak", "medium"),
    (2, "document_exposure", 'site:{domain} filetype:pdf "not for distribution"', "document_leak", "high"),

    # ================================================================
    # TIER 3 — COMPREHENSIVE / BROADER SIGNALS
    # ================================================================

    # --- Dev/DevOps Tooling Exposure ---
    (3, "devtools", 'site:{domain} inurl:phpmyadmin', "devtool_exposure", "high"),
    (3, "devtools", 'site:{domain} inurl:phpinfo.php', "devtool_exposure", "medium"),
    (3, "devtools", 'site:{domain} inurl:jenkins', "devtool_exposure", "medium"),
    (3, "devtools", 'site:{domain} inurl:grafana', "devtool_exposure", "low"),
    (3, "devtools", 'site:{domain} inurl:kibana', "devtool_exposure", "medium"),
    (3, "devtools", 'site:{domain} inurl:/server-status', "devtool_exposure", "medium"),
    (3, "devtools", 'site:{domain} inurl:/debug/', "devtool_exposure", "medium"),

    # --- API / Swagger / GraphQL ---
    (3, "api_exposure", 'site:{domain} inurl:swagger', "api_exposure", "low"),
    (3, "api_exposure", 'site:{domain} inurl:api-docs', "api_exposure", "low"),
    (3, "api_exposure", 'site:{domain} inurl:graphql intext:"__schema"', "api_exposure", "medium"),
    (3, "api_exposure", 'site:{domain} inurl:openapi.json', "api_exposure", "low"),
    (3, "api_exposure", 'site:{domain} inurl:/v1/ filetype:json', "api_exposure", "low"),

    # --- CMS-specific ---
    (3, "cms", 'site:{domain} inurl:wp-admin', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:wp-content/uploads', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:wp-content/plugins', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:joomla', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:administrator/index.php', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:/drupal', "cms_exposure", "low"),
    (3, "cms", 'site:{domain} inurl:/magento', "cms_exposure", "low"),

    # --- Employee / Personnel Exposure ---
    (3, "personnel", 'site:linkedin.com "{domain}" intitle:"engineer"', "employee_exposure", "info"),
    (3, "personnel", 'site:linkedin.com "{domain}" intitle:"administrator"', "employee_exposure", "info"),
    (3, "personnel", 'site:{domain} filetype:pdf "curriculum vitae"', "document_leak", "low"),
    (3, "personnel", 'site:{domain} filetype:xlsx "employee"', "document_leak", "medium"),
    (3, "personnel", 'site:{domain} "org chart" filetype:pdf', "document_leak", "low"),

    # --- Email Archives ---
    (3, "email_archive", 'site:{domain} "from:" filetype:eml', "email_leak", "medium"),
    (3, "email_archive", 'site:{domain} intitle:"mail archive"', "email_leak", "medium"),

    # --- Misc / IoT / Webcams ---
    (3, "iot_webcam", 'site:{domain} inurl:view/index.shtml', "iot_exposure", "medium"),
    (3, "iot_webcam", 'site:{domain} intitle:"Live View / - AXIS"', "iot_exposure", "medium"),
    (3, "iot_webcam", 'site:{domain} intitle:"webcam"', "iot_exposure", "low"),

    # --- FTP / Index ---
    (3, "ftp_index", 'site:{domain} intitle:"FTP root at"', "ftp_exposure", "medium"),
    (3, "ftp_index", 'site:{domain} "ftp://" filetype:txt', "ftp_exposure", "low"),

    # --- Mobile App Config / APK ---
    (3, "mobile", 'site:{domain} filetype:apk', "mobile_exposure", "low"),
    (3, "mobile", 'site:{domain} filetype:plist', "mobile_exposure", "low"),

    # --- Git platform mentions (GitLab/Bitbucket self-hosted) ---
    (3, "self_hosted_git", 'site:{domain} inurl:gitlab', "self_hosted_vcs", "low"),
    (3, "self_hosted_git", 'site:{domain} inurl:gitea', "self_hosted_vcs", "low"),
    (3, "self_hosted_git", 'site:{domain} inurl:bitbucket', "self_hosted_vcs", "low"),

    # --- Cross-site domain mentions (off-site leaks) ---
    (3, "cross_site_leak", 'site:pastebin.com "{domain}" password', "cross_site_leak", "high"),
    (3, "cross_site_leak", 'site:pastebin.com "@{domain}"', "cross_site_leak", "medium"),
    (3, "cross_site_leak", 'site:gist.github.com "{domain}"', "cross_site_leak", "medium"),
    (3, "cross_site_leak", 'site:trello.com "{domain}"', "cross_site_leak", "medium"),
    (3, "cross_site_leak", 'site:stackoverflow.com "{domain}" "api_key"', "cross_site_leak", "medium"),
    (3, "cross_site_leak", 'site:scribd.com "{domain}" confidential', "cross_site_leak", "medium"),

    # --- Backup / Misc Archives ---
    (3, "misc_archives", 'site:{domain} filetype:zip inurl:backup', "backup_exposure", "high"),
    (3, "misc_archives", 'site:{domain} filetype:rar', "archive_exposure", "low"),
    (3, "misc_archives", 'site:{domain} filetype:7z', "archive_exposure", "low"),
    (3, "misc_archives", 'site:{domain} filetype:tar.gz', "archive_exposure", "medium"),

    # --- Source code snippets in public sites ---
    (3, "source_leak", 'site:codepen.io "{domain}"', "source_leak", "medium"),
    (3, "source_leak", 'site:jsfiddle.net "{domain}"', "source_leak", "medium"),
    (3, "source_leak", 'site:gitlab.com "{domain}" password', "source_leak", "high"),

    # --- Forum / Ticket mentions ---
    (3, "external_mentions", 'site:reddit.com "{domain}" breach', "external_mention", "info"),
    (3, "external_mentions", 'site:reddit.com "{domain}" leak', "external_mention", "info"),
    (3, "external_mentions", '"{domain}" site:hackerone.com', "external_mention", "info"),
    (3, "external_mentions", '"{domain}" site:bugcrowd.com', "external_mention", "info"),
]


def get_dorks(active_tiers: set[int]) -> list[tuple[int, str, str, str, str]]:
    """Return dorks filtered by active tiers."""
    return [d for d in DORKS if d[0] in active_tiers]


def get_categories() -> dict[str, int]:
    """Count dorks per category (for UI/debug)."""
    counts: dict[str, int] = {}
    for _, cat, *_ in DORKS:
        counts[cat] = counts.get(cat, 0) + 1
    return counts


TOTAL_DORKS = len(DORKS)
