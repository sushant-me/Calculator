// Get references to the display elements
const historyDisplay = document.getElementById("history-display");
const currentDisplay = document.getElementById("current-display");
const modeDisplay = document.getElementById("mode-display");
// Get all calculator buttons
const buttons = document.querySelectorAll(".calc-button");

// Initialize calculator state variables
let currentInput = "0"; // Stores the current number being entered
let expression = ""; // Stores the full mathematical expression
let angleMode = "deg"; // 'deg' for degrees, 'rad' for radians
let lastResult = 0; // Stores the last calculated result for 'Ans' button
let memory = 0; // Stores value for memory functions

// Regex to check if the last character in the expression is an operator or function start
const endsWithOperatorOrParen = /[+\-*/%^(\s]$/;
const endsWithFunction =
  /(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|sqrt|cbrt|exp|fact)\($/;

// Function to update the display
function updateDisplay() {
  currentDisplay.textContent = currentInput;
  historyDisplay.textContent = expression;
  modeDisplay.textContent = angleMode.toUpperCase();
}

// Function to clear all inputs and reset the calculator
function clearAll() {
  currentInput = "0";
  expression = "";
  lastResult = 0;
  updateDisplay();
}

// Function to delete the last character from the current input or expression
function deleteLast() {
  if (currentInput !== "0" && currentInput.length > 0) {
    currentInput = currentInput.slice(0, -1);
    if (currentInput === "") {
      currentInput = "0";
    }
  } else if (expression.length > 0) {
    // If currentInput is 0, try to delete from the expression
    // This is a simpler approach; a more robust one would involve parsing the expression tree
    expression = expression.slice(0, -1);
    if (expression === "") {
      currentInput = "0";
    } else {
      // Try to set currentInput based on what was just deleted
      const lastChar = expression[expression.length - 1];
      if (!isNaN(lastChar) || lastChar === ".") {
        // If the last character is a number or decimal, try to rebuild currentInput
        const match = expression.match(/(\d+\.?\d*|\.\d+)$/);
        if (match) {
          currentInput = match[0];
        } else {
          currentInput = "0";
        }
      } else {
        currentInput = "0"; // If deleting an operator or paren, reset currentInput
      }
    }
  }
  updateDisplay();
}

// Function to append a number or decimal to the current input
function appendNumber(number) {
  if (currentInput === "0" && number !== ".") {
    currentInput = number;
  } else if (number === "." && currentInput.includes(".")) {
    return; // Prevent multiple decimal points
  } else {
    currentInput += number;
  }
  updateDisplay();
}

// Function to handle operator clicks
function chooseOperator(op) {
  if (currentInput === "Error") {
    clearAll();
    return;
  }

  // Append the current number to the expression before adding the operator
  if (currentInput !== "0" || (expression === "" && currentInput === "0")) {
    expression += currentInput;
  }

  // Replace the last operator if consecutive operators are pressed
  if (expression.length > 0 && endsWithOperatorOrParen.test(expression)) {
    // Check for specific operator types to allow '*-' or '/-'
    const lastTwo = expression.slice(-2);
    if (
      op === "-" &&
      (lastTwo.endsWith("+") || lastTwo.endsWith("*") || lastTwo.endsWith("/"))
    ) {
      expression += op; // Allow e.g., 5 * -2
    } else if (op === "-" && expression.endsWith("(")) {
      expression += op; // Allow e.g., (-5)
    } else if (expression.endsWith(op)) {
      // If the last char is already this operator, do nothing
      return;
    } else {
      // Otherwise, replace the last operator
      expression = expression.slice(0, -1) + op;
    }
  } else {
    expression += op;
  }

  currentInput = "0"; // Reset for the next number
  updateDisplay();
}

// Function to handle parentheses
function appendParen(paren) {
  if (currentInput === "Error") {
    clearAll();
    return;
  }

  if (paren === "(") {
    // If a number is currently displayed, assume multiplication before opening parenthesis
    if (currentInput !== "0") {
      expression += currentInput + "*";
      currentInput = "0"; // Clear current input after appending to expression
    }
    expression += "(";
  } else if (paren === ")") {
    // If there's a current number, append it before closing parenthesis
    if (currentInput !== "0") {
      expression += currentInput;
      currentInput = "0"; // Clear current input
    }
    expression += ")";
  }
  updateDisplay();
}

// Function to perform the calculation
function calculate() {
  if (currentInput === "Error") {
    clearAll();
    return;
  }

  // Append the last number typed to the expression
  if (currentInput !== "0") {
    expression += currentInput;
  }

  let result;
  try {
    // Replace special function notations with Math. equivalents
    // Note: For ^ (power), we convert it to Math.pow(base, exponent) in the expression string.
    // This requires careful parsing or ensuring the operator is handled correctly.
    // For simplicity, let's process x^y as a binary operator.
    // For now, if x^y is used, `chooseOperator` will add '^' and then calculate will
    // need to convert this to Math.pow.
    // A better way is to convert `expression` to `jsExpression`
    let jsExpression = expression
      .replace(/π/g, "Math.PI")
      .replace(/e/g, "Math.E");

    // Handle power (x^y)
    jsExpression = jsExpression.replace(
      /(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g,
      "Math.pow($1, $3)"
    );

    // Handle functions
    jsExpression = jsExpression.replace(/sin\(([^)]*)\)/g, (match, p1) => {
      const val = parseFloat(p1);
      return angleMode === "deg"
        ? `Math.sin(${val} * (Math.PI / 180))`
        : `Math.sin(${val})`;
    });
    jsExpression = jsExpression.replace(/cos\(([^)]*)\)/g, (match, p1) => {
      const val = parseFloat(p1);
      return angleMode === "deg"
        ? `Math.cos(${val} * (Math.PI / 180))`
        : `Math.cos(${val})`;
    });
    jsExpression = jsExpression.replace(/tan\(([^)]*)\)/g, (match, p1) => {
      const val = parseFloat(p1);
      const angleRad = angleMode === "deg" ? val * (Math.PI / 180) : val;
      if (Math.abs(Math.cos(angleRad)) < 1e-9) {
        // Check for values near vertical asymptotes
        throw new Error("Tan Undefined");
      }
      return `Math.tan(${angleRad})`;
    });

    jsExpression = jsExpression.replace(/asin\(([^)]*)\)/g, "Math.asin($1)");
    jsExpression = jsExpression.replace(/acos\(([^)]*)\)/g, "Math.acos($1)");
    jsExpression = jsExpression.replace(/atan\(([^)]*)\)/g, "Math.atan($1)");
    jsExpression = jsExpression.replace(/sinh\(([^)]*)\)/g, "Math.sinh($1)");
    jsExpression = jsExpression.replace(/cosh\(([^)]*)\)/g, "Math.cosh($1)");
    jsExpression = jsExpression.replace(/tanh\(([^)]*)\)/g, "Math.tanh($1)");
    jsExpression = jsExpression.replace(/log\(([^)]*)\)/g, "Math.log10($1)"); // log is base 10
    jsExpression = jsExpression.replace(/ln\(([^)]*)\)/g, "Math.log($1)"); // ln is natural log
    jsExpression = jsExpression.replace(/exp\(([^)]*)\)/g, "Math.exp($1)"); // e^x
    jsExpression = jsExpression.replace(/sqrt\(([^)]*)\)/g, "Math.sqrt($1)");
    jsExpression = jsExpression.replace(/cbrt\(([^)]*)\)/g, "Math.cbrt($1)");

    // Factorial needs custom handling; it's simpler to do it after evaluation if it's the only operation,
    // or integrate into evaluation. For now, we'll assume it's applied to a number.
    // This is a common simplification for calculator factorial.
    jsExpression = jsExpression.replace(/(\d+)!/g, (match, p1) => {
      const num = parseInt(p1);
      if (num < 0 || !Number.isInteger(num))
        throw new Error("Factorial of non-integer/negative");
      let f = 1;
      for (let i = 1; i <= num; i++) {
        f *= i;
      }
      return f;
    });

    // Use a try-catch block for eval to handle errors
    result = eval(jsExpression);

    if (isNaN(result) || !isFinite(result)) {
      throw new Error("Invalid calculation");
    }

    currentInput = parseFloat(result.toFixed(10)).toString(); // Round for display precision
    lastResult = result;
    expression = jsExpression + " = "; // Show the full expression and result
    updateDisplay();
  } catch (error) {
    currentInput = "Error";
    expression = error.message;
    updateDisplay();
    console.error("Calculation Error:", error); // Log error for debugging
  }
}

// Function to handle scientific functions
function applyFunction(func) {
  if (currentInput === "Error") {
    clearAll();
    return;
  }

  // If there's a current number, append it to the expression with the function call
  if (currentInput !== "0") {
    expression += currentInput;
  }

  // Functions that take an argument directly (e.g., sin(X))
  const functionsWithArg = [
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "sinh",
    "cosh",
    "tanh",
    "log",
    "ln",
    "sqrt",
    "cbrt",
    "exp",
    "fact",
  ];

  if (functionsWithArg.includes(func)) {
    expression += `${func}(`; // Append function name and opening parenthesis
    currentInput = "0"; // Reset current input, awaiting argument or ')'
  } else if (func === "power") {
    // x^y
    if (currentInput !== "0") {
      expression += currentInput;
    }
    expression += "^"; // Append power operator
    currentInput = "0";
  } else if (func === "mod") {
    // Modulus operator
    if (currentInput !== "0") {
      expression += currentInput;
    }
    expression += "%"; // Append modulus operator
    currentInput = "0";
  } else if (func === "pi") {
    if (currentInput === "0" || endsWithOperatorOrParen.test(expression)) {
      currentInput = Math.PI.toString();
    } else {
      // If a number is already present, treat it as multiplication
      expression += currentInput + "*";
      currentInput = Math.PI.toString();
    }
    // No need to add to expression here, it will be added when the next operator/calculate is pressed
  } else if (func === "e") {
    if (currentInput === "0" || endsWithOperatorOrParen.test(expression)) {
      currentInput = Math.E.toString();
    } else {
      expression += currentInput + "*";
      currentInput = Math.E.toString();
    }
  } else if (func === "ans") {
    currentInput = lastResult.toString();
  } else if (func === "deg-rad") {
    angleMode = angleMode === "deg" ? "rad" : "deg";
  }
  updateDisplay();
}

// Memory functions
let memoryValue = 0; // Initialize memory

function handleMemory(action) {
  if (currentInput === "Error") {
    clearAll();
    return;
  }

  switch (action) {
    case "m-plus":
      memoryValue += parseFloat(currentInput);
      currentInput = "0"; // Clear current input after adding to memory
      break;
    case "m-minus":
      memoryValue -= parseFloat(currentInput);
      currentInput = "0"; // Clear current input
      break;
    case "mr": // Memory Recall
      currentInput = memoryValue.toString();
      break;
    case "mc": // Memory Clear
      memoryValue = 0;
      break;
  }
  updateDisplay();
}

// Add event listeners to all buttons
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.type;
    const action = button.dataset.action;
    const func = button.dataset.function;
    const memoryAction = button.dataset.memory;

    if (type === "number") {
      appendNumber(button.textContent);
    } else if (type === "operator") {
      chooseOperator(button.textContent);
    } else if (type === "paren") {
      appendParen(button.textContent);
    } else if (action === "calculate") {
      calculate();
    } else if (action === "clear") {
      clearAll();
    } else if (action === "delete") {
      deleteLast();
    } else if (func) {
      applyFunction(func);
    } else if (memoryAction) {
      handleMemory(memoryAction);
    }
  });
});

// Initial display update
updateDisplay();

// Add keyboard support
document.addEventListener("keydown", (e) => {
  const key = e.key;

  if (key >= "0" && key <= "9") {
    appendNumber(key);
  } else if (key === ".") {
    appendNumber(key);
  } else if (["+", "-", "*", "/", "%"].includes(key)) {
    chooseOperator(key);
  } else if (key === "Enter" || key === "=") {
    e.preventDefault(); // Prevent default Enter behavior (e.g., form submission)
    calculate();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape") {
    clearAll();
  } else if (key === "(" || key === ")") {
    appendParen(key);
  } else if (key === "^") {
    applyFunction("power"); // For x^y
  }
  // No direct keyboard support for scientific functions and memory as they are typically button-driven
});
