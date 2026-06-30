// API Base URL - ใช้ Relative Path เพื่อให้ทำงานได้อัตโนมัติไม่ว่าโฟลเดอร์ชื่ออะไร
const API_BASE_URL = 'smartfarm-api/api'; 

// DOM Elements
const sensorContainer = document.getElementById('sensor-container');
const deviceContainer = document.getElementById('device-container');
const connectionStatus = document.getElementById('connection-status');

// Helper to determine icon based on sensor name
function getSensorIconClass(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('temp')) return ['fa-temperature-quarter', 'icon-temp'];
    if (lowerName.includes('humid')) return ['fa-droplet', 'icon-humid'];
    if (lowerName.includes('soil') || lowerName.includes('moist')) return ['fa-seedling', 'icon-soil'];
    return ['fa-microchip', 'icon-default'];
}

// Fetch Sensor Data
async function fetchSensors() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data.success) {
            renderSensors(data.data);
            updateStatus(true);
        }
    } catch (error) {
        console.error('Error fetching sensors:', error);
        updateStatus(false);
    }
}

// Render Sensor Cards
function renderSensors(sensors) {
    if (!sensors || sensors.length === 0) {
        sensorContainer.innerHTML = '<p class="loading">No sensor data available.</p>';
        return;
    }

    // Remove loading message if it exists
    const loadingMsg = sensorContainer.querySelector('.loading');
    if (loadingMsg) {
        sensorContainer.innerHTML = '';
    }
    
    sensors.forEach(sensor => {
        const [iconClass, bgClass] = getSensorIconClass(sensor.sensor_name);
        
        // Format time
        const timeObj = new Date(sensor.datetime);
        const timeString = timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        // Use sensor ID or name for a unique card ID
        const uniqueId = sensor.id || sensor.sensor_name.replace(/\s+/g, '-');
        const cardId = `sensor-card-${uniqueId}`;
        let card = document.getElementById(cardId);

        if (card) {
            // Update existing card data
            card.querySelector('.sensor-details p').textContent = `Updated: ${timeString}`;
            
            const valueContainer = card.querySelector('.sensor-value');
            // Re-render value only if it changed to trigger CSS if needed, or just update it softly
            valueContainer.innerHTML = `${sensor.sensor_value}<span>${sensor.unit}</span>`;
            
        } else {
            // Create new card
            card = document.createElement('div');
            card.className = 'sensor-card';
            card.id = cardId;
            card.innerHTML = `
                <div class="sensor-info">
                    <div class="sensor-icon ${bgClass}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="sensor-details">
                        <h3>${sensor.sensor_name}</h3>
                        <p>Updated: ${timeString}</p>
                    </div>
                </div>
                <div class="sensor-value">
                    ${sensor.sensor_value}<span>${sensor.unit}</span>
                </div>
            `;
            sensorContainer.appendChild(card);
        }
    });
}

// Fetch Devices
async function fetchDevices() {
    try {
        const response = await fetch(`${API_BASE_URL}/devices`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data.success) {
            // Filter only LEDs for the control panel
            const leds = data.data.filter(device => device.device_type === 'LED');
            renderDevices(leds);
            updateStatus(true);
        }
    } catch (error) {
        console.error('Error fetching devices:', error);
        updateStatus(false);
    }
}

// Render Device Cards (Toggle Switches)
function renderDevices(devices) {
    if (!devices || devices.length === 0) {
        deviceContainer.innerHTML = '<p class="loading">No devices available.</p>';
        return;
    }

    const loadingMsg = deviceContainer.querySelector('.loading');
    if (loadingMsg) {
        deviceContainer.innerHTML = '';
    }
    
    devices.forEach(device => {
        const isON = device.status === 'ON';
        const cardId = `device-card-${device.id}`;
        let card = document.getElementById(cardId);

        if (card) {
            // Update existing card
            const toggle = document.getElementById(`toggle-${device.id}`);
            if (toggle && toggle.checked !== isON) {
                toggle.checked = isON;
            }
            if (isON) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        } else {
            // Create new card
            card = document.createElement('div');
            card.className = `device-card ${isON ? 'active' : ''}`;
            card.id = cardId;
            
            card.innerHTML = `
                <div class="device-info">
                    <div class="device-icon">
                        <i class="fa-solid fa-lightbulb"></i>
                    </div>
                    <div class="device-details">
                        <h3>${device.device_name}</h3>
                        <p>Pin: ${device.pin}</p>
                    </div>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-${device.id}" ${isON ? 'checked' : ''} onchange="toggleDevice(${device.id}, this)">
                    <span class="slider"></span>
                </label>
            `;
            deviceContainer.appendChild(card);
        }
    });
}

// Toggle Device Status (PUT Request)
async function toggleDevice(id, checkbox) {
    const newStatus = checkbox.checked ? 'ON' : 'OFF';
    checkbox.disabled = true; // Disable during request
    
    try {
        const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update Card Style
            const card = document.getElementById(`device-card-${id}`);
            if (newStatus === 'ON') {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        } else {
            // Revert if failed
            checkbox.checked = !checkbox.checked;
            alert('Failed to update device: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating device:', error);
        checkbox.checked = !checkbox.checked; // Revert
        alert('Network error while updating device');
    } finally {
        checkbox.disabled = false;
    }
}

function updateStatus(isOnline) {
    if (isOnline) {
        connectionStatus.textContent = 'System Online';
        connectionStatus.className = 'status-indicator online';
    } else {
        connectionStatus.textContent = 'System Offline / Error';
        connectionStatus.className = 'status-indicator offline';
    }
    
    // Update timestamp
    const now = new Date();
    document.getElementById('last-update-time').textContent = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initial Load
function init() {
    fetchSensors();
    fetchDevices();
    
    // Auto Refresh every 5 seconds
    setInterval(() => {
        fetchSensors();
        fetchDevices();
    }, 5000);
}

// Start app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
