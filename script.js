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
    const lineThicknessInput = document.getElementById('line-thickness');
    const thicknessValueDisplay = document.getElementById('thickness-value');

    // Canvas settings
    let isDrawing = false;
    let isMultiLineDrawing = false; // For multi-segment line drawing
    let isShapeStarted = false; // Track if a rectangle/circle has been started
    let currentShape = 'rectangle';
    let linePoints = []; // Store points for multi-segment lines
    let currentMousePos = { x: 0, y: 0 }; // Track current mouse position for line preview
    let shapes = [];
    let tempShape = null;
    let showGrid = true; // Toggle for grid visibility

    // Default colors and thickness
    let strokeColor = '#000000';
    let fillColor = '#ffffff';
    let bgColor = null; // null represents transparent background
    let lineThickness = 1; // Default line thickness
    
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

    // Add grid toggle to toolbar
    const gridToggleBtn = document.createElement('button');
    gridToggleBtn.id = 'grid-toggle';
    gridToggleBtn.className = 'tool-btn active';
    gridToggleBtn.textContent = 'Grid: On';
    gridToggleBtn.addEventListener('click', () => {
        showGrid = !showGrid;
        gridToggleBtn.textContent = showGrid ? 'Grid: On' : 'Grid: Off';
        gridToggleBtn.classList.toggle('active', showGrid);
        redrawCanvas();
    });
    
    // Add grid toggle button to the toolbar
    const toolbarFirstGroup = document.querySelector('.tool-group');
    toolbarFirstGroup.appendChild(gridToggleBtn);
    
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
    
    // Line thickness control
    lineThicknessInput.addEventListener('input', (e) => {
        lineThickness = parseInt(e.target.value);
        thicknessValueDisplay.textContent = `${lineThickness}px`;
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

    // Track if mouse is pressed
    let isMouseDown = false;
    
    // Function to update resize handle visibility based on drawing state
    function updateResizeHandleState() {
        if (isShapeStarted || isMultiLineDrawing) {
            // Disable resize handle during drawing
            resizeHandle.style.pointerEvents = 'none';
            resizeHandle.style.opacity = '0.3'; // Visual indication that it's disabled
        } else {
            // Enable resize handle when not drawing
            resizeHandle.style.pointerEvents = 'auto';
            resizeHandle.style.opacity = '1';
        }
    }
    
    // Mouse event listeners for drawing
    canvas.addEventListener('mousedown', (e) => {
        // Ignore clicks on resize handle
        if (e.target === resizeHandle) return;
        
        isMouseDown = true;
        handleMouseDown(e);
        
        // Update resize handle state when drawing starts
        updateResizeHandleState();
    });
    
    // Use document-level mouse move to track even when outside canvas
    document.addEventListener('mousemove', (e) => {
        // Only call handleMouseMove if we're over the canvas or a drawing operation is in progress
        if (isShapeStarted || isMultiLineDrawing) {
            // Convert global coordinates to canvas coordinates
            const rect = canvas.getBoundingClientRect();
            const adjustedEvent = {
                clientX: e.clientX,
                clientY: e.clientY,
                button: e.button
            };
            handleMouseMove(adjustedEvent);
        } else if (e.target === canvas) {
            // If not in drawing mode but mouse is over canvas, handle normally
            handleMouseMove(e);
        }
    });
    
    // Document-level mouse up to catch even when released outside canvas
    document.addEventListener('mouseup', (e) => {
        if (isMouseDown) {
            isMouseDown = false;
            handleMouseUp(e);
        }
    });
    
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
    
    // Snap coordinates to pixel centers in the preview canvas
    function snapCoordinatesToPreview(x, y) {
        // Calculate where this point would appear in the preview canvas
        const previewX = x * (targetWidth / sourceWidth);
        const previewY = y * (targetHeight / sourceHeight);
        
        // Floor the coordinate and add 0.5 to get the pixel center
        // This ensures we're targeting the center of each pixel, not the boundary
        const snappedPreviewX = Math.floor(previewX) + 0.5;
        const snappedPreviewY = Math.floor(previewY) + 0.5;
        
        // Convert back to main canvas coordinates
        const snappedX = snappedPreviewX * (sourceWidth / targetWidth);
        const snappedY = snappedPreviewY * (sourceHeight / targetHeight);
        
        return { x: snappedX, y: snappedY };
    }
    
    // Handle mouse down event - start drawing or add line point
    // Track the last mouse down timestamp to prevent double-counting points on double-click
    let lastMouseDownTime = 0;
    const DOUBLE_CLICK_THRESHOLD = 300; // ms
    
    function handleMouseDown(e) {
        if (e.button !== 0) return; // Only handle left-click
        
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // Snap coordinates to preview grid
        const snapped = snapCoordinatesToPreview(x, y);
        x = snapped.x;
        y = snapped.y;
        
        // Get current timestamp
        const now = Date.now();
        
        if (currentShape === 'line') {
            // Line tool with multi-segment support
            if (!isMultiLineDrawing) {
                // Start a new line
                isMultiLineDrawing = true;
                linePoints = [{ x, y }]; // First point
                lastMouseDownTime = now;
            } else {
                // Only add a point if this isn't part of a double-click sequence
                // This prevents adding the same point twice when double-clicking to end a line
                if (now - lastMouseDownTime > DOUBLE_CLICK_THRESHOLD) {
                    // Add another point to the line
                    linePoints.push({ x, y });
                }
                lastMouseDownTime = now;
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
                    
                    // Re-enable resize handle after finishing shape
                    updateResizeHandleState();
                }
            }
        }
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        let currentX = e.clientX - rect.left;
        let currentY = e.clientY - rect.top;
        
        // Ensure coordinates are within canvas bounds for better behavior
        currentX = Math.max(0, Math.min(canvas.width, currentX));
        currentY = Math.max(0, Math.min(canvas.height, currentY));
        
        // Snap coordinates to preview grid for the actual shape
        // but keep the unsnapped coordinates for smooth cursor following
        const snapped = snapCoordinatesToPreview(currentX, currentY);
        const snappedX = snapped.x;
        const snappedY = snapped.y;
        
        // Update current mouse position for line tool
        currentMousePos = { x: currentX, y: currentY };
        
        if (currentShape === 'line' && isMultiLineDrawing) {
            // Create a preview of the multi-segment line
            tempShape = {
                type: 'multiLine',
                points: [...linePoints, { x: snappedX, y: snappedY }],
                previewPoint: { x: snappedX, y: snappedY },
                strokeColor,
                fillColor,
                lineThickness
            };
            
            redrawCanvas();
            updatePreviewCanvas();
        } else if (isShapeStarted) {
            // Rectangle or circle shape preview
            tempShape = {
                type: currentShape,
                startX: drawStartX,
                startY: drawStartY,
                width: snappedX - drawStartX,
                height: snappedY - drawStartY,
                endX: snappedX,
                endY: snappedY,
                strokeColor,
                fillColor,
                lineThickness
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
        
        // Update resize handle state in case the drawing operation finished
        updateResizeHandleState();
    }

    // Finish multi-segment line on double-click or right-click
    function finishMultiLine(e) {
        if (!isMultiLineDrawing || linePoints.length < 2) return;
        
        // On double-click, we want to use the existing points without adding the final click point again
        // The final click point is already in the linePoints array from the preceding single click
        
        // Create a final shape representing the multi-segment line
        const lineShape = {
            type: 'multiLine',
            points: [...linePoints], // Copy the points array
            strokeColor,
            fillColor,
            lineThickness
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
        
        // Re-enable resize handle after finishing multiline
        updateResizeHandleState();
    }

    // Cancel drawing operations - retained but no longer triggered on mouseout
    function cancelDrawing() {
        isDrawing = false;
        isMultiLineDrawing = false;
        isShapeStarted = false;
        linePoints = [];
        tempShape = null;
        redrawCanvas();
        updatePreviewCanvas();
        
        // Re-enable resize handle after canceling drawing
        updateResizeHandleState();
    }

    // Draw a grid on the canvas that represents preview pixel boundaries and centers
    function drawGrid(context, width, height) {
        if (!showGrid) return;
        
        const scaleX = sourceWidth / targetWidth;
        const scaleY = sourceHeight / targetHeight;
        
        context.save();
        
        // Draw pixel boundaries
        context.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        context.lineWidth = 0.5;
        
        // Draw vertical lines for each pixel column in the preview canvas
        for (let x = 0; x <= targetWidth; x++) {
            const canvasX = x * scaleX;
            context.beginPath();
            context.moveTo(canvasX, 0);
            context.lineTo(canvasX, height);
            context.stroke();
        }
        
        // Draw horizontal lines for each pixel row in the preview canvas
        for (let y = 0; y <= targetHeight; y++) {
            const canvasY = y * scaleY;
            context.beginPath();
            context.moveTo(0, canvasY);
            context.lineTo(width, canvasY);
            context.stroke();
        }
        
        // Optionally draw pixel centers (as small dots)
        context.fillStyle = 'rgba(100, 100, 100, 0.3)';
        for (let x = 0; x < targetWidth; x++) {
            for (let y = 0; y < targetHeight; y++) {
                // Draw a dot at each pixel center
                const centerX = (x + 0.5) * scaleX;
                const centerY = (y + 0.5) * scaleY;
                context.beginPath();
                context.arc(centerX, centerY, 1, 0, Math.PI * 2);
                context.fill();
            }
        }
        
        // Highlight every 10th line for better visibility
        context.strokeStyle = 'rgba(150, 150, 150, 0.6)';
        context.lineWidth = 1;
        
        for (let x = 0; x <= targetWidth; x += 10) {
            const canvasX = x * scaleX;
            context.beginPath();
            context.moveTo(canvasX, 0);
            context.lineTo(canvasX, height);
            context.stroke();
        }
        
        for (let y = 0; y <= targetHeight; y += 10) {
            const canvasY = y * scaleY;
            context.beginPath();
            context.moveTo(0, canvasY);
            context.lineTo(width, canvasY);
            context.stroke();
        }
        
        context.restore();
    }
    
    function redrawCanvas() {
        // Clear canvas (with transparency)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill with background color if specified
        if (bgColor !== null) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw the grid first so it appears behind all shapes
        drawGrid(ctx, canvas.width, canvas.height);
        
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
        
        // Apply line thickness with appropriate scaling
        const thickness = shape.lineThickness || 1; // Default to 1 if not specified (for backward compatibility)
        
        // If we're drawing on the main canvas (where scaleX is 1), scale the thickness up
        // If we're drawing on the preview canvas (scaleX != 1), use the exact thickness
        if (scaleX === 1) {
            // Scale thickness based on the ratio between source and target dimensions
            const thicknessScaleFactor = sourceWidth / targetWidth;
            context.lineWidth = thickness * thicknessScaleFactor;
        } else {
            // For the preview canvas, use the exact thickness as specified
            context.lineWidth = thickness;
        }
        
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
            code += `ctx.lineWidth = ${shape.lineThickness || 1};\n`; // Thinner lines for crisper edges
            
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
