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
    let currentShape = 'rectangle';
    let startX = 0;
    let startY = 0;
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
    let drawStartX, drawStartY; // Starting position for drawing
    
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
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', finishDrawing);
    canvas.addEventListener('mouseout', cancelDrawing);

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

    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        
        // With fixed canvas size, we just need to calculate the offset
        // No need for scaling since canvas pixel size = display size
        drawStartX = e.clientX - rect.left;
        drawStartY = e.clientY - rect.top;
    }

    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        
        // With fixed canvas size, we just need to calculate the offset
        // No need for scaling since canvas pixel size = display size
        let currentX = e.clientX - rect.left;
        let currentY = e.clientY - rect.top;

        // Create temporary shape for drawing preview
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

    function finishDrawing() {
        if (!isDrawing) return;
        
        isDrawing = false;
        if (tempShape) {
            shapes.push(tempShape);
            tempShape = null;
            updatePreviewCanvas();
            updateCodeOutput();
        }
    }

    function cancelDrawing() {
        if (isDrawing) {
            isDrawing = false;
            tempShape = null;
            redrawCanvas();
            updatePreviewCanvas();
        }
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
        
        // Calculate scaled dimensions and snap to pixel grid
        const scaledStartX = Math.floor(shape.startX * scaleX);
        const scaledStartY = Math.floor(shape.startY * scaleY);
        const scaledWidth = Math.floor(shape.width * scaleX);
        const scaledHeight = Math.floor(shape.height * scaleY);
        const scaledEndX = Math.floor(shape.endX * scaleX);
        const scaledEndY = Math.floor(shape.endY * scaleY);
        
        switch (shape.type) {
            case 'rectangle':
                context.beginPath();
                context.rect(scaledStartX, scaledStartY, scaledWidth, scaledHeight);
                context.fill();
                context.stroke();
                break;
                
            case 'circle':
                context.beginPath();
                // Calculate radius based on width and height
                const radius = Math.sqrt(scaledWidth ** 2 + scaledHeight ** 2) / 2;
                // Use starting point as center
                context.arc(scaledStartX, scaledStartY, radius, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                break;
                
            case 'line':
                context.beginPath();
                context.moveTo(scaledStartX, scaledStartY);
                context.lineTo(scaledEndX, scaledEndY);
                context.stroke();
                break;
        }
    }

    function updateCodeOutput() {
        // Calculate scale factors for target dimensions
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        
        let code = `// Canvas drawing code
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d', { alpha: ${bgColor === null} });

// Set canvas size
canvas.width = ${targetWidth};
canvas.height = ${targetHeight};

// Disable anti-aliasing for crisp rendering
ctx.imageSmoothingEnabled = false;

// Clear canvas (with transparency)
ctx.clearRect(0, 0, canvas.width, canvas.height);

`;

        // Add background color if not transparent
        if (bgColor !== null) {
            code += `// Fill background
ctx.fillStyle = '${bgColor}';
ctx.fillRect(0, 0, canvas.width, canvas.height);

`;
        }

        shapes.forEach((shape, index) => {
            // Calculate scaled dimensions
            const scaledStartX = Math.round(shape.startX * scaleX);
            const scaledStartY = Math.round(shape.startY * scaleY);
            const scaledWidth = Math.round(shape.width * scaleX);
            const scaledHeight = Math.round(shape.height * scaleY);
            const scaledEndX = Math.round(shape.endX * scaleX);
            const scaledEndY = Math.round(shape.endY * scaleY);
            
            code += `// Shape ${index + 1}: ${shape.type}\n`;
            code += `ctx.strokeStyle = '${shape.strokeColor}';\n`;
            code += `ctx.fillStyle = '${shape.fillColor}';\n`;
            code += `ctx.lineWidth = 2;\n`;
            
            switch (shape.type) {
                case 'rectangle':
                    code += `ctx.beginPath();\n`;
                    code += `ctx.rect(${scaledStartX}, ${scaledStartY}, ${scaledWidth}, ${scaledHeight});\n`;
                    code += `ctx.fill();\n`;
                    code += `ctx.stroke();\n`;
                    break;
                    
                case 'circle':
                    const radius = Math.round(Math.sqrt(scaledWidth ** 2 + scaledHeight ** 2) / 2);
                    code += `ctx.beginPath();\n`;
                    code += `ctx.arc(${scaledStartX}, ${scaledStartY}, ${radius}, 0, Math.PI * 2);\n`;
                    code += `ctx.fill();\n`;
                    code += `ctx.stroke();\n`;
                    break;
                    
                case 'line':
                    code += `ctx.beginPath();\n`;
                    code += `ctx.moveTo(${scaledStartX}, ${scaledStartY});\n`;
                    code += `ctx.lineTo(${scaledEndX}, ${scaledEndY});\n`;
                    code += `ctx.stroke();\n`;
                    break;
            }
            
            code += `\n`;
        });
        
        codeOutput.value = code;
    }
});
