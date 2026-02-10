// Variables data
const variables = [
    { name: 'PM2.5', unit: 'µg/m³', description: 'Bụi mịn (mục tiêu dự báo)' },
    { name: 'PM10', unit: 'µg/m³', description: 'Bụi thô' },
    { name: 'NO2', unit: 'µg/m³', description: 'Nitơ đioxit' },
    { name: 'O3', unit: 'µg/m³', description: 'Ozon' },
    { name: 'SO2', unit: 'µg/m³', description: 'Lưu huỳnh đioxit' },
    { name: 'CO', unit: 'µg/m³', description: 'Cacbon monoxit' },
    { name: 'Temp', unit: '°C', description: 'Nhiệt độ' },
    { name: 'Humid', unit: '%', description: 'Độ ẩm' }
];

// Generate correlation values for heatmap (simulated data)
function generateCorrelationMatrix(variables) {
    const matrix = [];
    for (let i = 0; i < variables.length; i++) {
        const row = [];
        for (let j = 0; j < variables.length; j++) {
            if (i === j) {
                // Diagonal: perfect correlation
                row.push(1.0);
            } else {
                // Simulate correlation values between -1 and 1
                // Higher correlation for similar variables
                let correlation = Math.random() * 0.8 - 0.4;
                if (i < 2 && j < 2) {
                    // PM2.5 and PM10 are highly correlated
                    correlation = 0.7 + Math.random() * 0.2;
                } else if ((i >= 2 && i < 6) && (j >= 2 && j < 6)) {
                    // Gas pollutants are moderately correlated
                    correlation = 0.3 + Math.random() * 0.4;
                }
                row.push(Math.round(correlation * 100) / 100);
            }
        }
        matrix.push(row);
    }
    return matrix;
}

// Get color based on correlation value
function getHeatmapColor(value) {
    // Normalize value to 0-1 range (assuming correlations are between -1 and 1)
    const normalized = (value + 1) / 2;
    
    // Create gradient from light teal to dark teal
    if (normalized < 0.2) {
        return '#b2dfdb'; // Very light teal
    } else if (normalized < 0.4) {
        return '#80cbc4'; // Light teal
    } else if (normalized < 0.6) {
        return '#4db6ac'; // Medium teal
    } else if (normalized < 0.8) {
        return '#26a69a'; // Medium-dark teal
    } else {
        return '#00695c'; // Dark teal
    }
}

// Create heatmap
function createHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    const correlationMatrix = generateCorrelationMatrix(variables);
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'heatmap-header';
    headerRow.style.setProperty('--var-count', variables.length);
    headerRow.style.gridTemplateColumns = `auto repeat(${variables.length}, 1fr)`;
    
    // Empty cell for corner
    const cornerCell = document.createElement('div');
    cornerCell.className = 'heatmap-header-cell';
    headerRow.appendChild(cornerCell);
    
    // Variable names as column headers
    variables.forEach(variable => {
        const headerCell = document.createElement('div');
        headerCell.className = 'heatmap-header-cell';
        headerCell.textContent = variable.name;
        headerRow.appendChild(headerCell);
    });
    
    container.appendChild(headerRow);
    
    // Create data rows
    variables.forEach((variable, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        
        // Row label
        const rowLabel = document.createElement('div');
        rowLabel.className = 'heatmap-row-label';
        rowLabel.textContent = variable.name;
        row.appendChild(rowLabel);
        
        // Row cells
        const rowCells = document.createElement('div');
        rowCells.className = 'heatmap-row-cells';
        rowCells.style.setProperty('--var-count', variables.length);
        rowCells.style.gridTemplateColumns = `repeat(${variables.length}, 1fr)`;
        
        variables.forEach((_, colIndex) => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            const value = correlationMatrix[rowIndex][colIndex];
            // Display "+1" as shown in the design, but use actual correlation for color
            cell.textContent = '+1';
            cell.style.backgroundColor = getHeatmapColor(value);
            
            // Add tooltip with actual correlation value
            cell.title = `${variable.name} vs ${variables[colIndex].name}: ${value.toFixed(2)}`;
            
            // Add click handler
            cell.addEventListener('click', function() {
                console.log(`Correlation between ${variable.name} and ${variables[colIndex].name}: ${value.toFixed(2)}`);
            });
            
            rowCells.appendChild(cell);
        });
        
        row.appendChild(rowCells);
        container.appendChild(row);
    });
}

// Populate variable table
function populateVariableTable() {
    const tbody = document.getElementById('variableTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    variables.forEach(variable => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = variable.name;
        row.appendChild(nameCell);
        
        const unitCell = document.createElement('td');
        unitCell.textContent = variable.unit;
        row.appendChild(unitCell);
        
        const descCell = document.createElement('td');
        descCell.textContent = variable.description;
        row.appendChild(descCell);
        
        tbody.appendChild(row);
    });
}

// Handle dropdown changes
function setupDropdowns() {
    const modeDropdown = new Dropdown('modeDropdown', {
        items: [
            { value: 'list', text: 'Danh sách' },
            { value: 'grid', text: 'Lưới' }
        ],
        defaultItem: 'list',
        onSelect: function(value) {
            console.log('Mode changed to:', value);
            // Add logic for mode change if needed
        }
    });

    const stationDropdown = new Dropdown('stationDropdown', {
        items: [
            { value: 's1', text: 'S1' },
            { value: 's2', text: 'S2' },
            { value: 's3', text: 'S3' }
        ],
        defaultItem: 's1',
        onSelect: function(value) {
            console.log('Station changed to:', value);
            // Add logic to filter data by station if needed
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    createHeatmap();
    populateVariableTable();
    setupDropdowns();
    
    // Add smooth scrolling for table
    const tableContainer = document.querySelector('.variable-table-container');
    if (tableContainer) {
        // Custom scroll behavior can be added here if needed
    }
});
