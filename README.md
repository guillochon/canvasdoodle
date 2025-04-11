# Canvas Doodle to Code

A web application that allows you to draw shapes on a canvas and automatically generates the corresponding JavaScript canvas code.

## Demo

Check out the live demo at [astrocrash.net/canvasdoodle](https://astrocrash.net/canvasdoodle)

## Features

- **Interactive Drawing Tools**:
  - Rectangle
  - Circle
  - Line
  - Arc
- **Styling Options**:
  - Stroke color
  - Fill color (with option to disable)
  - Line thickness
  - Background color (with transparent option)
- **Canvas Management**:
  - Resize drawing canvas
  - Undo functionality
  - Clear canvas
- **Code Generation**:
  - Real-time JavaScript canvas code generation
  - Copy code to clipboard
- **Preview**:
  - Adjustable target dimensions
  - Preview canvas

## Getting Started

### Prerequisites

- Node.js

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd canvasdoodle
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How to Use

1. Select a drawing tool (Rectangle, Circle, Line, or Arc)
2. Customize your shape with the available styling options
3. Draw on the canvas by clicking and dragging
4. View the generated JavaScript code in the right panel
5. Adjust the target dimensions to see how your drawing would look at different sizes
6. Copy the generated code to use in your own projects

## Project Structure

- `index.html` - Main HTML structure
- `styles.css` - CSS styling
- `script.js` - Main JavaScript functionality for drawing and code generation
- `server.js` - Simple Node.js server

## License

This project is licensed under the ISC License.
