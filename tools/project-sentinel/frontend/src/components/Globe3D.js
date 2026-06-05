import React, { useEffect, useRef, useState } from 'react';
import './Globe3D.css';

function Globe3D({ alerts }) {
  const containerRef = useRef(null);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    if (!window.THREE) {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
        .then(() => {
          console.log('Three.js loaded');
          initGlobe();
          setGlobeReady(true);
        })
        .catch(err => console.error('Failed to load Three.js:', err));
    } else {
      initGlobe();
      setGlobeReady(true);
    }
  }, []);

  useEffect(() => {
    if (globeReady && alerts.length > 0) {
      updateArcs(alerts);
    }
  }, [alerts, globeReady]);

  const latLonToVector3 = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new window.THREE.Vector3(x, y, z);
  };

  const initGlobe = () => {
    if (!containerRef.current || !window.THREE) return;

    const THREE = window.THREE;
    const container = containerRef.current;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.z = 250;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Earth sphere HD
    const globeGeometry = new THREE.SphereGeometry(100, 128, 128);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
      function(texture) {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    );

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 15,
      specular: new THREE.Color(0x111111)
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(102, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    globeGroup.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(200, 100, 200);
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    fillLight.position.set(-200, -100, -200);
    scene.add(fillLight);

    window.globeArcs = [];
    window.globeScene = scene;
    window.globeCamera = camera;
    window.globeRenderer = renderer;
    window.globeGroup = globeGroup;

    // Fokus ke Indonesia
    globeGroup.rotation.y = -Math.PI * 0.6;

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });

    renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });
    renderer.domElement.addEventListener('mouseleave', () => { isDragging = false; });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.offsetX - previousMousePosition.x;
        const deltaY = e.offsetY - previousMousePosition.y;
        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;
        globeGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globeGroup.rotation.x));
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
      }
    });

    // Deep zoom
    renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.5;
      camera.position.z = Math.max(105, Math.min(600, camera.position.z));
    });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    console.log('Globe initialized');
  };

  const updateArcs = (alertsData) => {
    if (!window.THREE || !window.globeGroup) return;

    const THREE = window.THREE;
    const globeGroup = window.globeGroup;

    if (window.globeArcs) {
      window.globeArcs.forEach(arc => globeGroup.remove(arc));
      window.globeArcs = [];
    }

    const geoAlerts = alertsData.filter(a =>
      a.source_lat && a.source_lon && a.destination_lat && a.destination_lon
    );

    // Track unique destinations to avoid overlapping markers
    const destinationKeys = new Set();

    geoAlerts.forEach((alert, index) => {
      const startPoint = latLonToVector3(alert.source_lat, alert.source_lon, 100.5);
      const endPoint = latLonToVector3(alert.destination_lat, alert.destination_lon, 100.5);

      // Arc
      const distance = startPoint.distanceTo(endPoint);
      const arcHeight = Math.max(distance * 0.35, 8);
      const midPoint = new THREE.Vector3()
        .addVectors(startPoint, endPoint)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(100.5 + arcHeight);

      const curve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
      const curvePoints = curve.getPoints(80);

      const tubeGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(curvePoints),
        80,
        0.15,
        6,
        false
      );

      const isHighSeverity = alert.rule_level >= 7;
      const arcColor = isHighSeverity ? 0xff2222 : 0x22ff44;

      const arc = new THREE.Mesh(tubeGeometry, new THREE.MeshBasicMaterial({
        color: arcColor,
        transparent: true,
        opacity: 0.7
      }));
      globeGroup.add(arc);
      window.globeArcs.push(arc);

      // Source marker - tiny dot
      const sourceMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: isHighSeverity ? 0xff2222 : 0x22ff44 })
      );
      sourceMarker.position.copy(startPoint);
      globeGroup.add(sourceMarker);
      window.globeArcs.push(sourceMarker);

      // Source ring - small
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.2, 32),
        new THREE.MeshBasicMaterial({
          color: isHighSeverity ? 0xff0000 : 0x00ff44,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        })
      );
      ring.position.copy(startPoint);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(ring);
      window.globeArcs.push(ring);

      // Destination marker - only render ONCE per unique location
      const destKey = `${alert.destination_lat},${alert.destination_lon}`;
      if (!destinationKeys.has(destKey)) {
        destinationKeys.add(destKey);

        const destMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x00ccff })
        );
        destMarker.position.copy(endPoint);
        globeGroup.add(destMarker);
        window.globeArcs.push(destMarker);

        // Destination ring
        const destRing = new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1.5, 32),
          new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
          })
        );
        destRing.position.copy(endPoint);
        destRing.lookAt(new THREE.Vector3(0, 0, 0));
        globeGroup.add(destRing);
        window.globeArcs.push(destRing);
      }
    });

    console.log('Rendered', geoAlerts.length, 'arcs, unique destinations:', destinationKeys.size);
  };

  return (
    <div className="globe-container">
      <div ref={containerRef} className="globe-canvas"></div>
      {!globeReady && <div className="globe-loading">Loading globe...</div>}
    </div>
  );
}

export default Globe3D;
