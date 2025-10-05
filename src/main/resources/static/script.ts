'use strict';

// ==========================================================================
// Constants & DOM Elements
// ==========================================================================

const svgNamespace = 'http://www.w3.org/2000/svg';
const SVG_SIZE = 100;
const KEY_FOR_TABLE_HISTORY = 'table_history';

// -- SVG Elements
const dotContainer = document.getElementById('dot-container') as unknown as SVGElement;
const xAxisTicks = document.getElementById('x-axis-ticks') as unknown as SVGElement;
const yAxisTicks = document.getElementById('y-axis-ticks') as unknown as SVGElement;

// -- Form Elements
const form = document.getElementById('coordinates-form') as HTMLFormElement;
const hiddenXInput = document.getElementById('x-value') as HTMLInputElement;
const yInput = document.getElementById('y-value') as HTMLInputElement;
const rSelect = document.getElementById('r-value') as HTMLSelectElement;
const resetTableButton = document.getElementById('clear-button') as HTMLButtonElement;
const xButtons = document.querySelectorAll<HTMLButtonElement>('.x-button');

// -- Other UI Elements
const tableBody = document.querySelector('.results-table tbody') as HTMLTableSectionElement;
const errorContainer = document.getElementById('error-container') as HTMLElement;

// ==========================================================================
// Interfaces
// ==========================================================================

interface ServerResponse {
    x: number;
    y: number;
    r: number;
    hit: boolean;
    currentTime: string;
    executionTime: string;
}

// ==========================================================================
// Event Listeners
// ==========================================================================

resetTableButton.addEventListener('click', () => {
    tableBody.innerHTML = '';
    dotContainer.innerHTML = '';
    localStorage.removeItem(KEY_FOR_TABLE_HISTORY);
    console.log('History cleared.');
});

xButtons.forEach((button) => {
    button.addEventListener('click', (event: MouseEvent) => {
        const clickedButton = event.target as HTMLButtonElement;
        hiddenXInput.value = clickedButton.value;

        xButtons.forEach((btn) => btn.classList.remove('selected'));
        clickedButton.classList.add('selected');
    });
});

form.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();
    hideError();
    const errorMessage = validateAllFields();
    if (errorMessage) {
        showError(errorMessage);
        console.error('Validation error: ' + errorMessage);
    } else {
        console.log('Validation passed! Sending data.');
        sendDataToServer();
    }
});

rSelect.addEventListener('change', () => {
    const rValue = parseFloat(rSelect.value);
    updateGraphLabels(rValue);
});

document.addEventListener('DOMContentLoaded', () => {
    updateGraphLabels(parseFloat(rSelect.value));
    const resultsHistory = loadResultsFromLocalStorage();
    for (const result of resultsHistory) {
        addResultToTable(result);
    }
});

// ==========================================================================
// Functions
// ==========================================================================

function validateAllFields(): string | null {
    if (hiddenXInput.value === '') {
        return 'Please select an X value.';
    }

    const yValueStr = yInput.value.trim().replace(',', '.');
    if (yValueStr === '') {
        return 'Please enter a Y value.';
    }

    if (isNaN(parseFloat(yValueStr))) {
        return 'The Y value must be a number.';
    }

    const yNum = parseFloat(yValueStr);
    if (yNum < -5 || yNum > 5) {
        return 'The Y value must be in the range (-5 ... 5).';
    }

    if (rSelect.value === '') {
        return 'Please select an R value.';
    }

    return null;
}

function sendDataToServer(): void {
    const formData = new URLSearchParams();
    formData.append('x', hiddenXInput.value);
    formData.append('y', yInput.value.trim().replace(',', '.'));
    formData.append('r', rSelect.value);

    fetch('/calculate', {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((errorData: { error: string }) => {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                });
            }
            return response.json() as Promise<ServerResponse>;
        })
        .then((data) => {
            console.log('Data received successfully:', data);
            addResultToTable(data);
            updateResultsWithNewRow(data);
        })
        .catch((error) => {
            if (error instanceof Error) {
                console.error('An error occurred while sending data: ', error);
                showError(error.message);
            } else {
                console.error('An unknown error occurred:', error);
                showError('An unexpected error occurred.');
            }
        });
}

function addResultToTable(data: ServerResponse): void {
    const newRow = tableBody.insertRow(0);
    const hitStatus = data.hit ? 'Hit' : 'Miss';
    newRow.className = data.hit ? 'hit-true' : 'hit-false';

    newRow.innerHTML = `
        <td>${data.x.toFixed(2)}</td>
        <td>${data.y.toFixed(2)}</td>
        <td>${data.r.toFixed(2)}</td>
        <td>${hitStatus}</td>
        <td>${data.currentTime}</td>
        <td>${data.executionTime}</td>
    `;

    drawPoint(data.x, data.y, data.r, data.hit);
}

function showError(message: string): void {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

function hideError(): void {
    errorContainer.style.display = 'none';
}

function saveResultsToLocalStorage(results: ServerResponse[]): void {
    localStorage.setItem(KEY_FOR_TABLE_HISTORY, JSON.stringify(results));
}

function loadResultsFromLocalStorage(): ServerResponse[] {
    const savedResults = localStorage.getItem(KEY_FOR_TABLE_HISTORY);
    return savedResults ? (JSON.parse(savedResults) as ServerResponse[]) : [];
}

function updateResultsWithNewRow(data: ServerResponse): void {
    const resultsHistory = loadResultsFromLocalStorage();
    resultsHistory.unshift(data);
    saveResultsToLocalStorage(resultsHistory);
}

function updateGraphLabels(r: number): void {
    xAxisTicks.innerHTML = '';
    yAxisTicks.innerHTML = '';

    const createTick = (axis: 'x' | 'y', value: number, label: string) => {
        const svgPos = (axis === 'x' ? value : -value) * SVG_SIZE;

        const text = document.createElementNS(svgNamespace, 'text');
        text.setAttribute('x', axis === 'x' ? String(svgPos) : '-20');
        text.setAttribute('y', axis === 'x' ? '15' : String(svgPos + 3));
        text.textContent = label;

        const line = document.createElementNS(svgNamespace, 'line');
        line.setAttribute('x1', axis === 'x' ? String(svgPos) : '-5');
        line.setAttribute('y1', axis === 'x' ? '-5' : String(svgPos));
        line.setAttribute('x2', axis === 'x' ? String(svgPos) : '5');
        line.setAttribute('y2', axis === 'x' ? '5' : String(svgPos));

        if (axis === 'x') {
            xAxisTicks.appendChild(text);
            xAxisTicks.appendChild(line);
        } else {
            yAxisTicks.appendChild(text);
            yAxisTicks.appendChild(line);
        }
    };

    if (!r || isNaN(r)) {
        const labels = ['-R', '-R/2', 'R/2', 'R'];
        const values = [-1, -0.5, 0.5, 1];
        labels.forEach((label, i) => {
            createTick('x', values[i] / 1 * (r || 1), label);
            createTick('y', values[i] / 1 * (r || 1), label);
        });
    } else {
        const values = [-r, -r / 2, r / 2, r];
        values.forEach(value => {
            const relativeValue = value / r;
            const label = String(value);
            createTick('x', relativeValue, label);
            createTick('y', relativeValue, label);
        });
    }
}

function drawPoint(x: number, y: number, r: number, hit: boolean): void {
    if (r <= 0) {
        dotContainer.innerHTML = '';
        return
    };

    const existingDot = document.getElementById('result-dot');
    if (existingDot) {
        dotContainer.removeChild(existingDot);
    }

    const svgX = (x / r) * SVG_SIZE;
    const svgY = (-y / r) * SVG_SIZE;
    const dot = document.createElementNS(svgNamespace, 'circle');

    dot.setAttribute('id', 'result-dot');
    dot.setAttribute('cx', String(svgX));
    dot.setAttribute('cy', String(svgY));
    dot.setAttribute('r', '4');
    dot.style.fill = hit ? '#28a745' : '#dc3545';

    dotContainer.appendChild(dot);
}