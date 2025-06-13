let map;
let selectedProfile = null;
let currentMode = 'none'; // from, to, report
let routeMarkers = [];
let routeLines = [];
let barrierMarkers = [];
let rampMarkers = [];
let facilityMarkers = [];
let searchTimeout = null;
let lightLayer;
let darkLayer;

// Sample locations (need edit)
const singaporeLocations = [
    { name: "Marina Bay Sands", lat: 1.2834, lng: 103.8607 },
    { name: "Orchard Road", lat: 1.3048, lng: 103.8318 },
    { name: "Sentosa Island", lat: 1.2494, lng: 103.8303 },
    { name: "Clarke Quay", lat: 1.2884, lng: 103.8467 },
    { name: "Gardens by the Bay", lat: 1.2816, lng: 103.8636 },
    { name: "Singapore Zoo", lat: 1.4043, lng: 103.7930 },
    { name: "Changi Airport", lat: 1.3644, lng: 103.9915 },
    { name: "Universal Studios", lat: 1.2540, lng: 103.8238 },
    { name: "Merlion Park", lat: 1.2868, lng: 103.8545 },
    { name: "Chinatown", lat: 1.2812, lng: 103.8445 },
    { name: "Little India", lat: 1.3063, lng: 103.8492 },
    { name: "Kampong Glam", lat: 1.3009, lng: 103.8594 },
    { name: "East Coast Park", lat: 1.3018, lng: 103.9062 },
    { name: "Botanic Gardens", lat: 1.3138, lng: 103.8159 },
    { name: "ION Orchard", lat: 1.3041, lng: 103.8338 }
];

function initializeMap() {
    map = L.map('map').setView([1.3521, 103.8198], 12);

    lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });

    darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    lightLayer.addTo(map);

    map.on('click', function(e) {
        handleMapClick(e);
    });
}

function updateMapTiles(themeKey) {
    if (!map) return;
    if (themeKey === 'dark' || themeKey === 'high-contrast') {
        if (map.hasLayer(lightLayer)) map.removeLayer(lightLayer);
        if (!map.hasLayer(darkLayer)) darkLayer.addTo(map);
    } else {
        if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
        if (!map.hasLayer(lightLayer)) lightLayer.addTo(map);
    }
}

function setTheme(themeKey) {
    document.body.classList.remove('light-mode', 'dark-mode', 'high-contrast');
    if (themeKey === 'light' || themeKey === 'default') {
        document.body.classList.add('light-mode');
    } else if (themeKey === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (themeKey === 'high-contrast') {
        document.body.classList.add('high-contrast');
    }

    updateMapTiles(themeKey);
    localStorage.setItem('theme', themeKey);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeEventListeners();
    loadSampleData();

    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
});

function initializeEventListeners() {
    // profile selection
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectProfile(this.dataset.profile);
        });
    });

    // Route planning
    document.getElementById('find-route-btn').addEventListener('click', findRoute);
    document.getElementById('clear-route-btn').addEventListener('click', clearRoute);

    // search function
    document.getElementById('from-location').addEventListener('input', function(e) {
        handleSearch(e.target.value, 'from');
    });
    document.getElementById('to-location').addEventListener('input', function(e) {
        handleSearch(e.target.value, 'to');
    });

    // Barrier filters
    document.getElementById('show-barriers').addEventListener('change', toggleBarriers);
    document.getElementById('show-ramps').addEventListener('change', toggleRamps);
    document.getElementById('show-facilities').addEventListener('change', toggleFacilities);

    // Report form
    document.getElementById('submit-report-btn').addEventListener('click', submitReport);

    // Location input click
    document.getElementById('from-location').addEventListener('click', () => setMode('route-from'));
    document.getElementById('to-location').addEventListener('click', () => setMode('route-to'));
    document.getElementById('report-location').addEventListener('click', () => setMode('report'));

    //  will close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-input-container')) {
            hideAllSearchResults();
        }
    });
}

function selectProfile(profile) {
    selectedProfile = profile;
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-profile="${profile}"]`).classList.add('active');
}

function setMode(mode) {
    currentMode = mode;
    const indicator = document.getElementById('mode-indicator');

    switch(mode) {
        case 'route-from':
            indicator.textContent = 'Click map to set start point';
            break;
        case 'route-to':
            indicator.textContent = 'Click map to set destination';
            break;
        case 'report':
            indicator.textContent = 'Click map to select issue location';
            break;
        default:
            indicator.textContent = 'Select an option from the left panel';
    }
}

function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const location = `${lat}, ${lng}`;

    switch(currentMode) {
        case 'route-from':
            document.getElementById('from-location').value = location;
            setRouteMarker('from', e.latlng);
            updateRouteButton();
            break;
        case 'route-to':
            document.getElementById('to-location').value = location;
            setRouteMarker('to', e.latlng);
            updateRouteButton();
            break;
        case 'report':
            document.getElementById('report-location').value = location;
            updateReportButton();
            break;
    }

    setMode('none');
}

function handleSearch(query, type) {
    clearTimeout(searchTimeout);

    if (query.length < 2) {
        hideSearchResults(type);
        return;
    }

    searchTimeout = setTimeout(() => {
        const results = singaporeLocations.filter(location =>
            location.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        showSearchResults(results, type);
    }, 300);
}

function showSearchResults(results, type) {
    const resultsContainer = document.getElementById(`${type}-search-results`);

    if (results.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    resultsContainer.innerHTML = results.map(result =>
        `<div class="search-result-item" data-lat="${result.lat}" data-lng="${result.lng}" data-name="${result.name}">
            ${result.name}
        </div>`
    ).join('');

    // Add click handlers
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const name = this.dataset.name;

            document.getElementById(`${type}-location`).value = name;
            setRouteMarker(type, { lat, lng });
            updateRouteButton();
            hideSearchResults(type);
        });
    });

    resultsContainer.style.display = 'block';
}

function hideSearchResults(type) {
    document.getElementById(`${type}-search-results`).style.display = 'none';
}

function hideAllSearchResults() {
    hideSearchResults('from');
    hideSearchResults('to');
}

function setRouteMarker(type, latlng) {
    // Remove existing marker of this type
    routeMarkers = routeMarkers.filter(marker => {
        if (marker.type === type) {
            map.removeLayer(marker.marker);
            return false;
        }
        return true;
    });

    // Add new marker
    let marker;
    if (type === 'from') {
        // start point
        marker = L.circleMarker(latlng, {
            radius: 10,
            fillColor: '#FFFFFF',
            color: '#007AFF',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);
    } else {
        // end point
        marker = L.marker(latlng, {
            icon: L.divIcon({
                html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 36C12 36 24 24 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 24 12 36 12 36Z" fill="#007AFF"/>
                        <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
                       </svg>`,
                className: 'custom-div-icon',
                iconSize: [24, 36],
                iconAnchor: [12, 36]
            })
        }).addTo(map);
    }

    routeMarkers.push({ type, marker, latlng });
}

function updateRouteButton() {
    const fromValue = document.getElementById('from-location').value;
    const toValue = document.getElementById('to-location').value;
    document.getElementById('find-route-btn').disabled = !fromValue || !toValue;
}

function updateReportButton() {
    const locationValue = document.getElementById('report-location').value;
    const issueType = document.getElementById('issue-type').value;
    document.getElementById('submit-report-btn').disabled = !locationValue || !issueType;
}

function findRoute() {
    const fromMarker = routeMarkers.find(m => m.type === 'from');
    const toMarker = routeMarkers.find(m => m.type === 'to');

    if (fromMarker && toMarker) {
        // Clear existing route lines
        routeLines.forEach(line => map.removeLayer(line));
        routeLines = [];

        // Create intermediate points for a more realistic route
        const startLat = fromMarker.latlng.lat;
        const startLng = fromMarker.latlng.lng;
        const endLat = toMarker.latlng.lat;
        const endLng = toMarker.latlng.lng;

        // Calculate some intermediate points
        const midLat = (startLat + endLat) / 2 + (Math.random() - 0.5) * 0.01;
        const midLng = (startLng + endLng) / 2 + (Math.random() - 0.5) * 0.01;

        const quarter1Lat = (startLat + midLat) / 2;
        const quarter1Lng = (startLng + midLng) / 2;

        const quarter3Lat = (midLat + endLat) / 2;
        const quarter3Lng = (midLng + endLng) / 2;

        // Transport (solid line)
        const transportRoute = L.polyline([
            [startLat, startLng],
            [quarter1Lat, quarter1Lng],
            [midLat, midLng]
        ], {
            color: '#007AFF',
            weight: 5,
            // opacity: 0.8
        }).addTo(map);

        // walking segment (dotted)
        const walkingRoute = L.polyline([
            [midLat, midLng],
            [quarter3Lat, quarter3Lng],
            [endLat, endLng]
        ], {
            color: '#5856D6',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);

        routeLines.push(transportRoute, walkingRoute);

        // adjust map to fit route
        const allPoints = [
            [startLat, startLng],
            [quarter1Lat, quarter1Lng],
            [midLat, midLng],
            [quarter3Lat, quarter3Lng],
            [endLat, endLng]
        ];
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds.pad(0.1));
    }
}

function clearRoute() {
    routeMarkers.forEach(marker => map.removeLayer(marker.marker));
    routeMarkers = [];

    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    document.getElementById('from-location').value = '';
    document.getElementById('to-location').value = '';
    updateRouteButton();
}

function toggleBarriers(e) {
    barrierMarkers.forEach(marker => {
        if (e.target.checked) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

function toggleRamps(e) {
    rampMarkers.forEach(marker => {
        if (e.target.checked) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

function toggleFacilities(e) {
    facilityMarkers.forEach(marker => {
        if (e.target.checked) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

function submitReport() {
    const location = document.getElementById('report-location').value;
    const issueType = document.getElementById('issue-type').value;
    const description = document.getElementById('issue-description').value;

    if (location && issueType) {
        alert(`Report submitted!\nLocation: ${location}\nIssue: ${issueType}\nDescription: ${description || 'None'}`);

        document.getElementById('report-location').value = '';
        document.getElementById('issue-type').value = '';
        document.getElementById('issue-description').value = '';
        updateReportButton();
    }
}

function loadSampleData() {
    // Sample barrier data (need edit))
    const barriers = [
        { lat: 1.3521, lng: 103.8198, type: 'barrier', title: 'Missing Ramp', description: 'No wheelchair access' },
        { lat: 1.3500, lng: 103.8150, type: 'barrier', title: 'Blocked Path', description: 'Construction blocking pathway' }
    ];

    const ramps = [
        { lat: 1.3540, lng: 103.8220, type: 'ramp', title: 'Accessible Ramp', description: 'Wheelchair accessible entrance' },
        { lat: 1.3480, lng: 103.8180, type: 'ramp', title: 'Ramp Available', description: 'Step-free access' }
    ];

    const facilities = [
        { lat: 1.3560, lng: 103.8240, type: 'facility', title: 'Accessible Toilet', description: 'Wheelchair accessible facilities' },
        { lat: 1.3460, lng: 103.8160, type: 'facility', title: 'Accessible Parking', description: 'Reserved parking spaces' }
    ];

    // Add barrier markers
    barriers.forEach(item => {
        const marker = L.circleMarker([item.lat, item.lng], {
            radius: 8,
            fillColor: '#FF3B30',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`<strong>${item.title}</strong><br>${item.description}`).addTo(map);
        barrierMarkers.push(marker);
    });

    // ramp markers
    ramps.forEach(item => {
        const marker = L.circleMarker([item.lat, item.lng], {
            radius: 8,
            fillColor: '#30D158',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`<strong>${item.title}</strong><br>${item.description}`).addTo(map);
        rampMarkers.push(marker);
    });

    // facility markers
    facilities.forEach(item => {
        const marker = L.circleMarker([item.lat, item.lng], {
            radius: 8,
            fillColor: '#007AFF',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`<strong>${item.title}</strong><br>${item.description}`).addTo(map);
        facilityMarkers.push(marker);
    });
}

// Update report button when issue type changes
document.getElementById('issue-type').addEventListener('change', updateReportButton);
