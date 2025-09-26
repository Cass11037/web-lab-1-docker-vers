"use strict";

// -------------Constants----------------
const svgNamespace = "http://www.w3.org/2000/svg";
const SVG_SIZE = 100;
const KEY_FOR_TABLE_HISTORY = "table_history";

// DOM Elements for svg
const dotContainer = document.getElementById("dot-container");
const xAxisTicks = document.getElementById("x-axis-ticks");
const yAxisTicks = document.getElementById("y-axis-ticks");

// DOM Elements for form
const form = document.getElementById("coordinates-form");
const xButtons = document.querySelectorAll(".x-button");
const hiddenXInput = document.getElementById("x-value");
const yInput = document.getElementById("y-value");
const rSelect = document.getElementById("r-value");
const resetTableButton = document.getElementById("clear-button");

// DOM Elements
const tableBody = document.querySelector(".results-table tbody");
const errorContainer = document.getElementById("error-container");

resetTableButton.addEventListener("click", function (event) {
  tableBody.innerHTML = "";
  dotContainer.innerHTML = "";
  localStorage.removeItem(KEY_FOR_TABLE_HISTORY);
  console.log("History cleared.");
});
// X button preferences
xButtons.forEach(function (button) {
  button.addEventListener("click", function (event) {
    const clickedValue = event.target.value;
    hiddenXInput.value = clickedValue;

    xButtons.forEach((btn) => btn.classList.remove("selected"));
    event.target.classList.add("selected");
  });
});

// form preferences
form.addEventListener("submit", function (event) {
  event.preventDefault();
  hideError();
  const errorMessage = validateAllFields();
  if (errorMessage) {
    showError(errorMessage);
    console.error("Validation error: " + errorMessage);
  } else {
    console.log("Validation passed! Sending data.");
    sendDataToServer();
  }
});

// r preferences
rSelect.addEventListener("change", () => {
  const rValue = parseFloat(rSelect.value);
  updateGraphLabels(rValue);
});

//-------------------functions-----------------

/**
 * Checks the fields for compliance with requirements
 * @returns {String|null} The string with error message
 */
function validateAllFields() {
  const xValue = hiddenXInput.value;
  if (xValue === "") {
    return "Please select an X value.";
  }

  const yValueStr = yInput.value.trim().replace(",", ".");
  if (yValueStr === "") {
    return "Please enter a Y value.";
  }
  if (isNaN(yValueStr)) {
    return "The Y value must be a number.";
  }
  const yNum = parseFloat(yValueStr);
  if (yNum < -5 || yNum > 5) {
    return "The Y value must be in the range (-5 ... 5).";
  }

  const rValue = rSelect.value;
  if (rValue === "") {
    return "Please select an R value.";
  }

  return null;
}

/**
 * Sends x, y, r from user to server
 *
 */
function sendDataToServer() {
  const xValue = hiddenXInput.value;
  const yValue = yInput.value.trim().replace(",", ".");
  const rValue = rSelect.value;

  const formData = new URLSearchParams();
  formData.append("x", xValue);
  formData.append("y", yValue);
  formData.append("r", rValue);

  const serverURL = "/calculate";
  console.log("Load: " + formData); //x=0.5&y=3&r=1
  fetch(serverURL, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Data received successfully:", data);
      addResultToTable(data);
      updateResultsWithNewRow(data);
    })
    .catch((error) => {
      console.error("An error occurred while sending data: ", error);
      showError(error.message);
    });
}

/**
 * Adds row with response to main table
 * @param {Data} data The data from server
 */
function addResultToTable(data) {
  const newRow = tableBody.insertRow(0);

  const hitStatus = data.hit ? "Hit" : "Miss";
  newRow.className = data.hit ? "hit-true" : "hit-false";

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

/**
 * Show error in the block of html
 * @param {String} message The message of error
 */
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = "block";
}

/**
 * Hides error in the block of html
 */
function hideError() {
  errorContainer.style.display = "none";
}

function saveResultsToLocalStorage(results) {
  localStorage.setItem(KEY_FOR_TABLE_HISTORY, JSON.stringify(results));
}

function loadResultsFromLocalStorage() {
  const savedResults = localStorage.getItem(KEY_FOR_TABLE_HISTORY);
  return savedResults ? JSON.parse(savedResults) : [];
}

function updateResultsWithNewRow(data) {
  let resultsHistory = loadResultsFromLocalStorage();
  resultsHistory.unshift(data);
  saveResultsToLocalStorage(resultsHistory);
}
/**
 * Updates R when user shange their choice
 * @param {Float|NaN} r
 */
function updateGraphLabels(r) {
  xAxisTicks.innerHTML = "";
  yAxisTicks.innerHTML = "";

  if (!r || isNaN(r)) {
    const labels = ["-R", "-R/2", "R/2", "R"];
    const values = [-1, -0.5, 0.5, 1];

    for (let i = 0; i < labels.length; i++) {
      const labelText = labels[i];
      const position = values[i];

      const svgX = position * SVG_SIZE;

      const textX = document.createElementNS(svgNamespace, "text");
      textX.setAttribute("x", svgX);
      textX.setAttribute("y", 15);
      textX.textContent = labelText;
      xAxisTicks.appendChild(textX);

      const tickX = document.createElementNS(svgNamespace, "line");
      tickX.setAttribute("x1", svgX);
      tickX.setAttribute("y1", -5);
      tickX.setAttribute("x2", svgX);
      tickX.setAttribute("y2", 5);
      xAxisTicks.appendChild(tickX);

      const svgY = -position * SVG_SIZE;

      const textY = document.createElementNS(svgNamespace, "text");
      textY.setAttribute("x", -20);
      textY.setAttribute("y", svgY + 3);
      textY.textContent = labelText;
      yAxisTicks.appendChild(textY);

      const tickY = document.createElementNS(svgNamespace, "line");
      tickY.setAttribute("x1", -5);
      tickY.setAttribute("y1", svgY);
      tickY.setAttribute("x2", 5);
      tickY.setAttribute("y2", svgY);
      yAxisTicks.appendChild(tickY);
    }
  } else {
    const values = [-r, -r / 2, r / 2, r];
    for (const value of values) {
      const svgX = (value / r) * SVG_SIZE;

      const textX = document.createElementNS(svgNamespace, "text");
      textX.setAttribute("x", svgX);
      textX.setAttribute("y", 15);
      textX.textContent = value;
      xAxisTicks.appendChild(textX);

      const tickX = document.createElementNS(svgNamespace, "line");
      tickX.setAttribute("x1", svgX);
      tickX.setAttribute("y1", -5);
      tickX.setAttribute("x2", svgX);
      tickX.setAttribute("y2", 5);
      xAxisTicks.appendChild(tickX);

      const svgY = (-value / r) * SVG_SIZE;

      const textY = document.createElementNS(svgNamespace, "text");
      textY.setAttribute("x", -20);
      textY.setAttribute("y", svgY + 3);
      textY.textContent = value;
      yAxisTicks.appendChild(textY);

      const tickY = document.createElementNS(svgNamespace, "line");
      tickY.setAttribute("x1", -5);
      tickY.setAttribute("y1", svgY);
      tickY.setAttribute("x2", 5);
      tickY.setAttribute("y2", svgY);
      yAxisTicks.appendChild(tickY);
    }
  }
}

/**
 * Draws point with x,r,y
 * @param {Float} x
 * @param {Float} y
 * @param {Float} r
 * @param {Boolean} hit
 * @returns {null} if r <=0
 */
function drawPoint(x, y, r, hit) {
  dotContainer.innerHTML = "";
  if (r <= 0) return;
  const svgX = (x / r) * SVG_SIZE;
  const svgY = (-y / r) * SVG_SIZE;
  const dot = document.createElementNS(svgNamespace, "circle");
  dot.setAttribute("id", "result-dot");
  dot.setAttribute("cx", svgX);
  dot.setAttribute("cy", svgY);
  dot.setAttribute("r", 4);
  dot.style.fill = hit ? "#28a745" : "#dc3545";
  dotContainer.appendChild(dot);
}
document.addEventListener("DOMContentLoaded", () => {
  updateGraphLabels(parseFloat(rSelect.value));
  const resultsHistory = loadResultsFromLocalStorage();
  for (let i = resultsHistory.length - 1; i >= 0; i--) {
    addResultToTable(resultsHistory[i]);
  }
});
