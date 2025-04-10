document.addEventListener('DOMContentLoaded', () => {
    // Main drawing canvas elements
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d', { alpha: true }); // Alpha enabled for transparency
    
    // Disable anti-aliasing for sharper drawing
    ctx.imageSmoothingEnabled = false;
    
    // Preview canvas elements
    const previewCanvas = document.getElementById('preview-canvas');
    const previewCtx = previewCanvas.getContext('2d', { alpha: true }); // Alpha enabled for transparency
    
    // Disable anti-aliasing for sharper preview
    previewCtx.imageSmoothingEnabled = false;
    
    // UI elements
    const codeOutput = document.getElementById('code-output');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const undoBtn = document.getElementById('undo-btn');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const strokeColorPicker = document.getElementById('stroke-color');
    const fillColorPicker = document.getElementById('fill-color');
    const bgColorPicker = document.getElementById('bg-color');
    const transparentBgBtn = document.getElementById('transparent-bg');
    const targetWidthInput = document.getElementById('target-width');
    const targetHeightInput = document.getElementById('target-height');

    // Canvas settings
    let isDrawing = false;
    let isMultiLineDrawing = false; // For multi-segment line drawing
    let isShapeStarted = false; // Track if a rectangle/circle has been started
    let currentShape = 'rectangle';
    let linePoints = []; // Store points for multi-segment lines
    let currentMousePos = { x: 0, y: 0 }; // Track current mouse position for line preview
    let shapes = [];
    let tempShape = null;

    // Default colors
    let strokeColor = '#000000';
    let fillColor = '#ffffff';
    let bgColor = null; // null represents transparent background
    
    // Canvas container element
    const canvasContainer = document.getElementById('drawing-container');
    const resizeHandle = document.getElementById('resize-handle');
    
    // Source and target dimensions
    let sourceWidth = canvas.width;
    let sourceHeight = canvas.height;
    let targetWidth = parseInt(targetWidthInput.value);
    let targetHeight = parseInt(targetHeightInput.value);
    
    // Calculate aspect ratio
    let aspectRatio = targetWidth / targetHeight;
    let drawStartX, drawStartY; // Starting position for drawing

    // Resize the drawing canvas to match its container
    function resizeDrawingCanvas() {
        // Get the current dimensions of the container
        const containerWidth = canvasContainer.offsetWidth;
        const containerHeight = canvasContainer.offsetHeight;
        
        // Store current canvas image to restore after resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        
        // Update canvas dimensions
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // Apply the same settings to the new canvas
        ctx.imageSmoothingEnabled = false;
        
        // Restore the canvas content
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
        
        // Update source dimensions for future calculations
        sourceWidth = canvas.width;
        sourceHeight = canvas.height;
        
        // Redraw all shapes at the new size
        redrawCanvas();
    }
    
    // Resize the preview canvas to match target dimensions
    function resizePreviewCanvas() {
        // Set the exact pixel dimensions for the preview canvas
        previewCanvas.width = targetWidth;
        previewCanvas.height = targetHeight;
        
        // Explicitly set the style width and height to match the canvas dimensions
        previewCanvas.style.width = targetWidth + 'px';
        previewCanvas.style.height = targetHeight + 'px';
    }

    // Initialize displays
    resizePreviewCanvas(); // Set the exact dimensions on initial load
    updateCodeOutput();
    updatePreviewCanvas();

    // Event listeners for tool buttons
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShape = btn.dataset.shape;
        });
    });

    // Color pickers
    strokeColorPicker.addEventListener('change', (e) => {
        strokeColor = e.target.value;
    });

    fillColorPicker.addEventListener('change', (e) => {
        fillColor = e.target.value;
    });
    
    // Background color picker
    bgColorPicker.addEventListener('change', (e) => {
        bgColor = e.target.value;
        redrawCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });
    
    // Transparent background button
    transparentBgBtn.addEventListener('click', () => {
        bgColor = null; // null represents transparent background
        redrawCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });
    
    // Dimension inputs
    targetWidthInput.addEventListener('change', () => {
        targetWidth = parseInt(targetWidthInput.value);
        
        // Update aspect ratio
        aspectRatio = targetWidth / targetHeight;
        
        // Enforce aspect ratio on canvas container
        enforceAspectRatio();
        
        // Resize the canvas to match container
        resizeDrawingCanvas();
        
        // Update preview
        resizePreviewCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });
    
    targetHeightInput.addEventListener('change', () => {
        targetHeight = parseInt(targetHeightInput.value);
        
        // Update aspect ratio
        aspectRatio = targetWidth / targetHeight;
        
        // Enforce aspect ratio on canvas container
        enforceAspectRatio();
        
        // Resize the canvas to match container
        resizeDrawingCanvas();
        
        // Update preview
        resizePreviewCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });
    
    // Canvas container resize observer
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            // Update canvas dimensions when container is resized
            if (entry.target === canvasContainer) {
                resizeDrawingCanvas();
                updatePreviewCanvas();
                updateCodeOutput();
            }
        }
    });
    
    // Start observing the canvas container for size changes
    resizeObserver.observe(canvasContainer);
    
    // Enforce the aspect ratio when container is resized
    function enforceAspectRatio() {
        // Use the current width to calculate the proper height
        const width = canvasContainer.offsetWidth;
        const height = width / aspectRatio;
        
        canvasContainer.style.height = `${height}px`;
    }
    
    // Initial enforcement of aspect ratio
    enforceAspectRatio();
    
    // Implement custom resize handle with strict aspect ratio maintenance
    let isResizing = false;
    let resizeStartX, resizeStartY;
    let startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        startWidth = canvasContainer.offsetWidth;
        startHeight = canvasContainer.offsetHeight;
        document.body.style.cursor = 'nwse-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Calculate new width based on mouse movement
        const deltaX = e.clientX - resizeStartX;
        const newWidth = Math.max(startWidth + deltaX, canvasContainer.dataset.minWidth || 300);
        
        // Calculate new height to maintain aspect ratio
        const newHeight = newWidth / aspectRatio;
        
        // Apply new dimensions
        canvasContainer.style.width = `${newWidth}px`;
        canvasContainer.style.height = `${newHeight}px`;
        
        // Update canvas immediately to maintain responsive feel
        canvas.width = newWidth;
        canvas.height = newHeight;
        sourceWidth = newWidth;
        sourceHeight = newHeight;
        
        // Make sure anti-aliasing setting is maintained after resize
        ctx.imageSmoothingEnabled = false;
        
        // Redraw with new dimensions
        redrawCanvas();
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            
            // Ensure final dimensions strictly match the aspect ratio
            enforceAspectRatio();
            resizeDrawingCanvas();
            
            // Update preview and code to reflect the new size
            updatePreviewCanvas();
            updateCodeOutput();
        }
    });

    // Mouse event listeners for drawing
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', cancelDrawing);
    canvas.addEventListener('dblclick', finishMultiLine);
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent default right-click menu
        if (currentShape === 'line') {
            finishMultiLine(e);
        } else if (isShapeStarted) {
            // Cancel shape drawing on right click
            isShapeStarted = false;
            tempShape = null;
            redrawCanvas();
            updatePreviewCanvas();
        }
    });

    // Clear canvas
    clearBtn.addEventListener('click', () => {
        shapes = [];
        redrawCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });

    // Undo last shape
    undoBtn.addEventListener('click', () => {
        shapes.pop();
        redrawCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    });

    // Copy code to clipboard
    copyBtn.addEventListener('click', () => {
        codeOutput.select();
        document.execCommand('copy');
        // Alternative for modern browsers:
        // navigator.clipboard.writeText(codeOutput.value)
        //     .then(() => console.log('Code copied to clipboard'))
        //     .catch(err => console.error('Failed to copy: ', err));
        
        // Visual feedback
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
        }, 2000);
    });
    
    // Handle mouse down event - start drawing or add line point
    function handleMouseDown(e) {
        if (e.button !== 0) return; // Only handle left-click
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (currentShape === 'line') {
            // Line tool with multi-segment support
            if (!isMultiLineDrawing) {
                // Start a new line
                isMultiLineDrawing = true;
                linePoints = [{ x, y }]; // First point
            } else {
                // Add another point to the line
                linePoints.push({ x, y });
            }
        } else {
            // For rectangle and circle
            if (!isShapeStarted) {
                // First click - Start the shape
                isShapeStarted = true;
                drawStartX = x;
                drawStartY = y;
            } else {
                // Second click - Complete the shape
                isShapeStarted = false;
                if (tempShape) {
                    shapes.push(tempShape);
                    tempShape = null;
                    updatePreviewCanvas();
                    updateCodeOutput();
                }
            }
        }
    }
    
    // Handle mouse move for drawing preview
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Update current mouse position for line tool
        currentMousePos = { x: currentX, y: currentY };
        
        if (currentShape === 'line' && isMultiLineDrawing) {
            // Create a preview of the multi-segment line
            tempShape = {
                type: 'multiLine',
                points: [...linePoints, { x: currentX, y: currentY }],
                previewPoint: { x: currentX, y: currentY },
                strokeColor,
                fillColor
            };
            
            redrawCanvas();
            updatePreviewCanvas();
        } else if (isShapeStarted) {
            // Rectangle or circle shape preview
            tempShape = {
                type: currentShape,
                startX: drawStartX,
                startY: drawStartY,
                width: currentX - drawStartX,
                height: currentY - drawStartY,
                endX: currentX,
                endY: currentY,
                strokeColor,
                fillColor
            };

            redrawCanvas();
            updatePreviewCanvas();
        }
    }

    // Handle mouse up for completing regular shapes
    function handleMouseUp(e) {
        if (e.button !== 0) return; // Only handle left-click release
        
        // We no longer finish shapes on mouse up
        // Shapes are now started with first click and completed with second click
    }

    // Finish multi-segment line on double-click or right-click
    function finishMultiLine(e) {
        if (!isMultiLineDrawing || linePoints.length < 2) return;
        
        // Create a final shape representing the multi-segment line
        const lineShape = {
            type: 'multiLine',
            points: [...linePoints], // Copy the points array
            strokeColor,
            fillColor
        };
        
        // Add the complete line to shapes
        shapes.push(lineShape);
        
        // Reset the line drawing state
        isMultiLineDrawing = false;
        linePoints = [];
        tempShape = null;
        
        // Update display
        redrawCanvas();
        updatePreviewCanvas();
        updateCodeOutput();
    }

    // Cancel drawing operations
    function cancelDrawing() {
        isDrawing = false;
        isMultiLineDrawing = false;
        isShapeStarted = false;
        linePoints = [];
        tempShape = null;
        redrawCanvas();
        updatePreviewCanvas();
    }

    function redrawCanvas() {
        // Clear canvas (with transparency)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill with background color if specified
        if (bgColor !== null) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw all saved shapes
        shapes.forEach(shape => drawShape(ctx, shape, 1));
        
        // Draw current shape if any
        if (tempShape) {
            drawShape(ctx, tempShape, 1);
        }
    }
    
    function updatePreviewCanvas() {
        // Clear preview canvas (with transparency)
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Calculate scale factors for preview canvas
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        
        // Fill with background color if specified
        if (bgColor !== null) {
            previewCtx.fillStyle = bgColor;
            previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
        
        // Draw all shapes scaled to preview size
        shapes.forEach(shape => drawShape(previewCtx, shape, scaleX, scaleY));
        
        // Draw current shape if any
        if (tempShape) {
            drawShape(previewCtx, tempShape, scaleX, scaleY);
        }
    }

    // Helper function to snap coordinates to pixel grid for crisp rendering
    function snapToPixel(value) {
        return Math.round(value) + 0.5;
    }

    function drawShape(context, shape, scaleX, scaleY = scaleX) {
        context.strokeStyle = shape.strokeColor;
        context.fillStyle = shape.fillColor;
        context.lineWidth = 1; // Thinner lines for crisper edges
        
        switch (shape.type) {
            case 'rectangle': {
                // Calculate scaled dimensions and snap to pixel grid
                const scaledStartX = Math.floor(shape.startX * scaleX);
                const scaledStartY = Math.floor(shape.startY * scaleY);
                const scaledWidth = Math.floor(shape.width * scaleX);
                const scaledHeight = Math.floor(shape.height * scaleY);
                
                context.beginPath();
                context.rect(scaledStartX, scaledStartY, scaledWidth, scaledHeight);
                context.fill();
                context.stroke();
                break;
            }
                
            case 'circle': {
                // Calculate scaled dimensions and snap to pixel grid
                const scaledStartX = Math.floor(shape.startX * scaleX);
                const scaledStartY = Math.floor(shape.startY * scaleY);
                const scaledWidth = Math.floor(shape.width * scaleX);
                const scaledHeight = Math.floor(shape.height * scaleY);
                
                context.beginPath();
                // Calculate radius based on width and height
                const radius = Math.sqrt(scaledWidth ** 2 + scaledHeight ** 2) / 2;
                // Use starting point as center
                context.arc(scaledStartX, scaledStartY, radius, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                break;
            }
                
            case 'line': {
                // Calculate scaled dimensions and snap to pixel grid
                const scaledStartX = Math.floor(shape.startX * scaleX);
                const scaledStartY = Math.floor(shape.startY * scaleY);
                const scaledEndX = Math.floor(shape.endX * scaleX);
                const scaledEndY = Math.floor(shape.endY * scaleY);
                
                context.beginPath();
                context.moveTo(scaledStartX, scaledStartY);
                context.lineTo(scaledEndX, scaledEndY);
                context.stroke();
                break;
            }
                
            case 'multiLine': {
                // Draw a multi-segment line
                if (shape.points.length === 0) return;
                
                context.beginPath();
                
                // Move to the first point
                const firstPoint = shape.points[0];
                const scaledFirstX = Math.floor(firstPoint.x * scaleX);
                const scaledFirstY = Math.floor(firstPoint.y * scaleY);
                context.moveTo(scaledFirstX, scaledFirstY);
                
                // Add lines to each subsequent point
                for (let i = 1; i < shape.points.length; i++) {
                    const point = shape.points[i];
                    const scaledX = Math.floor(point.x * scaleX);
                    const scaledY = Math.floor(point.y * scaleY);
                    context.lineTo(scaledX, scaledY);
                }
                
                // Add preview point if available (for hover effect)
                if (shape.previewPoint) {
                    const previewX = Math.floor(shape.previewPoint.x * scaleX);
                    const previewY = Math.floor(shape.previewPoint.y * scaleY);
                    context.lineTo(previewX, previewY);
                }
                
                context.stroke();
                break;
            }
        }
    }

    function updateCodeOutput() {
        // Calculate scale factors for code
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        
        let code = `// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: true });

// Set canvas dimensions
canvas.width = ${targetWidth};
canvas.height = ${targetHeight};

// Disable anti-aliasing for sharper edges
ctx.imageSmoothingEnabled = false;

`;

        // Add background color if not transparent
        if (bgColor !== null) {
            code += `// Fill background
ctx.fillStyle = '${bgColor}';
ctx.fillRect(0, 0, canvas.width, canvas.height);

`;
        }

        shapes.forEach((shape, index) => {
            code += `// Shape ${index + 1}: ${shape.type}\n`;
            code += `ctx.strokeStyle = '${shape.strokeColor}';\n`;
            code += `ctx.fillStyle = '${shape.fillColor}';\n`;
            code += `ctx.lineWidth = 1;\n`; // Thinner lines for crisper edges
            
            switch (shape.type) {
                case 'rectangle': {
                    // Calculate scaled dimensions
                    const scaledStartX = Math.round(shape.startX * scaleX);
                    const scaledStartY = Math.round(shape.startY * scaleY);
                    const scaledWidth = Math.round(shape.width * scaleX);
                    const scaledHeight = Math.round(shape.height * scaleY);
                    
                    code += `ctx.beginPath();\n`;
                    code += `ctx.rect(${scaledStartX}, ${scaledStartY}, ${scaledWidth}, ${scaledHeight});\n`;
                    code += `ctx.fill();\n`;
                    code += `ctx.stroke();\n`;
                    break;
                }
                    
                case 'circle': {
                    // Calculate scaled dimensions
                    const scaledStartX = Math.round(shape.startX * scaleX);
                    const scaledStartY = Math.round(shape.startY * scaleY);
                    const scaledWidth = Math.round(shape.width * scaleX);
                    const scaledHeight = Math.round(shape.height * scaleY);
                    
                    const radius = Math.round(Math.sqrt(scaledWidth ** 2 + scaledHeight ** 2) / 2);
                    code += `ctx.beginPath();\n`;
                    code += `ctx.arc(${scaledStartX}, ${scaledStartY}, ${radius}, 0, Math.PI * 2);\n`;
                    code += `ctx.fill();\n`;
                    code += `ctx.stroke();\n`;
                    break;
                }
                    
                case 'line': {
                    // Calculate scaled dimensions
                    const scaledStartX = Math.round(shape.startX * scaleX);
                    const scaledStartY = Math.round(shape.startY * scaleY);
                    const scaledEndX = Math.round(shape.endX * scaleX);
                    const scaledEndY = Math.round(shape.endY * scaleY);
                    
                    code += `ctx.beginPath();\n`;
                    code += `ctx.moveTo(${scaledStartX}, ${scaledStartY});\n`;
                    code += `ctx.lineTo(${scaledEndX}, ${scaledEndY});\n`;
                    code += `ctx.stroke();\n`;
                    break;
                }
                
                case 'multiLine': {
                    // Handle multi-segment line
                    if (shape.points.length < 2) break;
                    
                    code += `ctx.beginPath();\n`;
                    
                    // First point
                    const firstPoint = shape.points[0];
                    const scaledFirstX = Math.round(firstPoint.x * scaleX);
                    const scaledFirstY = Math.round(firstPoint.y * scaleY);
                    code += `ctx.moveTo(${scaledFirstX}, ${scaledFirstY});\n`;
                    
                    // Additional points
                    for (let i = 1; i < shape.points.length; i++) {
                        const point = shape.points[i];
                        const scaledX = Math.round(point.x * scaleX);
                        const scaledY = Math.round(point.y * scaleY);
                        code += `ctx.lineTo(${scaledX}, ${scaledY});\n`;
                    }
                    
                    code += `ctx.stroke();\n`;
                    break;
                }
            }
            
            code += `\n`;
        });
        
        codeOutput.value = code;
    }
});
