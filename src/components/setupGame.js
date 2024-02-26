// Declaring variables for the canvas, image, puzzle pieces, etc.
export let canvas;

export let img, preview, frame;
export let pieces, placed, unplaced, puzzle, board;
export var tiles;

// Variables for puzzle dimensions, scaling, and loading status
export let cols, rows, aspect
export let cropX, cropY
export let scl, s

export let loading = true, verifying = false, solved = false, error = false, previewing = -1, progress, o

// Theme colors for the puzzle interface
export const Theme = {
    background: [255], board: [240], board_fill: [235], board_outline: [220]
}

// Settings for the puzzle
const Settings = {
    allowIncorrectPlacements: true, hintIncorrectPlacements: true
}

// Constants for piece states and orientations
export const NONE = 0
export const IN = -1
export const OUT = 1

export const Directions = { TOP: "top", BOTTOM: "bottom", LEFT: "left", RIGHT: "right" };

export const HORIZONTAL = 'horizontal'
export const VERTICAL = 'vertical'

export let prev

// Function to set up the initial configuration
function setup() {
    const imageParam = params.get('image') || 'https://i.imgur.com/4GqXJpx.jpeg'
    const imageURL = isEncoded(imageParam) ? decodeURIComponent(imageParam) : imageParam

    canvas = createCanvas(windowWidth, windowHeight)

    addScreenPositionFunction()

    prev = millis()
// Loading the image and handling GIF or regular image
    if (imageURL.endsWith('.gif')) {
        // Load GIF
        img = loadImage(imageURL, img2 => {
            // Load regular image
            img.resize(img.width * 2, img.height * 2)
            console.log('load: ', millis() - prev)
            document.querySelector('.ui').classList.remove('disabled')
            loading = false
            start()
        }, failure => error = true);
    } else {
        createImg(imageURL, 'puzzle', null, event => {
            let element = event.elt
            img = new p5.Image(element.width, element.height, p5.instance)
            img.drawingContext.drawImage(element, 0, 0)
            img.modified = true

            document.querySelector('.ui').classList.remove('disabled')
            loading = false
            start()
        });
    }
    // Set a timeout for loading, and if loading fails within the time, set an error flag
    setTimeout(() => loading ? (error = true) : false, 5000);
}

// Function to start the puzzle generation and setup
function start() {
    aspect = aspectRatio(round(img.width / 100) * 100, round(img.height / 100) * 100)

    if (aspect.x === 1 && aspect.y === 1) aspect = {x: 4, y: 4}
    while (aspect.x * aspect.y >= 50) aspect = {x: parseInt(aspect.x / 2), y: parseInt(aspect.y / 2)}
    while (aspect.x * aspect.y <= 9) aspect = {x: parseInt(aspect.x * 2), y: parseInt(aspect.y * 2)}

    cols = params.get('cols') > 0 ? params.get('cols') : aspect.x
    rows = params.get('rows') > 0 ? params.get('rows') : aspect.y
    scl = params.get('scale') > 0 ? params.get('scale') : 0.5

    progress = o = numFrames(img) * 2

    prev = millis()

    tiles = []
    for (let i = 0; i < numFrames(img); i++) {
        img.setFrame(i)
        tiles.push(cut(img, cols, rows, CENTER, CENTER))
        progress--
    }

    console.log('Generated Mask in: ', millis() - prev + "[ms]")

    prev = millis()

    // Generate puzzle pieces from the image
    tiles = makePuzzle(tiles);
    console.log({tiles})
    console.log('Generated Puzzle in: ', millis() - prev + "[ms]")

    // Create a preview image and set up puzzle board
    preview = img.get(cropX / 2, cropY / 2, img.width - cropX, img.height - cropY);
    console.log({preview});

    prev = millis()

    placed = []
    unplaced = []
    pieces = []
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let orientation = Math.random() < 0.5 ? HORIZONTAL : VERTICAL;
            let side = Math.random() < 0.5 ? -1 : 1;

            switch (orientation) {
                case HORIZONTAL:
                    positionX = side * preview.width / 2 * random(1.15, 1.90);
                    positionY = random(-preview.height / 2 * 1.15, preview.height / 2 * 1.15);
                    break;
                case VERTICAL:
                    positionX = random(-preview.width / 2 * 1.90, preview.width / 2 * 1.90);
                    positionY = side * preview.height / 2 * random(1.15, 1.45);
                    break;
            }

            const piece = new Piece(x, y, positionX, positionY);
            pieces.push(piece);
            unplaced.push(piece);
        }
    }

    // Generate the puzzle board with tilepieces
    board = (() => {
        let pg = createGraphics(parseInt(cols * tiles.sizeX + tiles.sizeX / 2 + 1), parseInt(rows * tiles.sizeY + tiles.sizeY / 2 + 1));
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let tile = tiles[0][x][y];

                pg.image(tile.jigsaw, x * tiles.sizeX, y * tiles.sizeY);
            }
        }
        return makeImage(pg);
    })();

    console.log('Generated Tilepieces in : ', millis() - prev + "[ms]")

    // Create puzzle object with relevant information
    puzzle = {
        width: preview.width,
        height: preview.height,
        ratio: {original: aspectRatio(img.width, img.height), simplified: aspect},
        count: pieces.length,
        pieces: new Map()
    };

    setupLinks();

    // Dispatch event indicating puzzle is loaded
    window.parent.document.dispatchEvent(new CustomEvent('puzzleLoaded', {puzzle}));
}

// Function to draw on the canvas continuously
function draw() {
    let piece;
    if (loading) {
        background(255);

        noStroke();
        textAlign(CENTER, CENTER);
        textSize(50);

        if (error) {
            fill(255, 0, 0);
            text("Failed to load puzzle", width / 2, height / 2);
            return;
        } else {
            fill(0);
            text("Loading puzzle", width / 2, height / 2);
        }

        stroke(0);
        strokeWeight(1);
        line(width * 0.25, height * 0.75, map(progress, 0, o, width * 0.25, width * 0.75), height * 0.75);

        return;
    }

    // Draw puzzle pieces, preview image, and board
    s = Math.min(width / img.width, height / img.height) * scl;
    frame = parseInt((0.5 * frameCount) % numFrames(img));

    background(Theme.background);

    translate(width / 2, height / 2);
    scale(s);

    let deltaPreviewing = millis() - previewing;
    let previewAlpha = map(sin((-(deltaPreviewing) * 0.002 + 1.5)), -1, 1, 0, 255);

    if (deltaPreviewing > 3000 || previewing === -1) previewAlpha = 255;

    if (solved) previewAlpha = 0;

    img.setFrame(frame);
    image(img, -preview.width / 2, -preview.height / 2, preview.width, preview.height, cropX / 2, cropY / 2, img.width - cropX, img.height - cropY);

    rectMode(CENTER);
    noStroke();
    fill(...Theme.board, previewAlpha);
    rect(0, 0, puzzle.width, puzzle.height);

    if (!solved) {
        push();
        translate(-tiles.sizeX / 2 - img.width / 2 + cropX / 2, -tiles.sizeY / 2 - img.height / 2 + cropY / 2);
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let tile = tiles[frame][x][y];

                let min = screenPosition(x * tiles.sizeX + tiles.sizeX * 0.5, y * tiles.sizeY + tiles.sizeY * 0.5);
                let max = screenPosition(x * tiles.sizeX + tiles.sizeX * 1.5, y * tiles.sizeY + tiles.sizeY * 1.5);

                if (mouseIsPressed && mouseX > min.x && mouseX < max.x && mouseY > min.y && mouseY < max.y) {
                    image(tile.jigsawFill, x * tiles.sizeX, y * tiles.sizeY);
                }
            }
        }
        image(board, 0, 0);
        pop();
    }

    for (let i = placed.length - 1; i >= 0; i--) {
        piece = placed[i];
        piece.update();
        piece.draw();
    }

    for (let i = placed.length - 1; i >= 0; i--) {
        piece = placed[i];
        piece.drawPost();
    }

    for (let i = unplaced.length - 1; i >= 0; i--) {
        piece = unplaced[i];
        piece.update();
        piece.draw();
    }
}

function mousePressed() {
    if (!error && !solved) for (let piece of pieces) {
        if (piece.pressed()) {
            let index = pieces.indexOf(piece);
            pieces.splice(index, 1);
            pieces.splice(0, 0, piece);

            index = unplaced.indexOf(piece);
            unplaced.splice(index, 1);
            unplaced.splice(0, 0, piece);
            break;
        }
    }
}

function mouseReleased() {
    if (!error && !solved) for (let piece of pieces) {
        piece.released();
    }
}

function onPieceRelease(piece) {
    if (piece.isInsidePuzzle()) {
        let coordX = Math.round((piece.x + (cols % 2 === 0 ? tiles.sizeX / 2 : 0)) / tiles.sizeX);
        let coordY = Math.round((piece.y + (rows % 2 === 0 ? tiles.sizeY / 2 : 0)) / tiles.sizeY);

        let x = Math.trunc(coordX + cols / 2 + (cols % 2 === 0 ? -1 : 0));
        let y = Math.trunc(coordY + rows / 2 + (rows % 2 === 0 ? -1 : 0));

        if (piece.matchesShape(x, y) && !puzzle.pieces.has(`${x},${y}`)) {
            piece.x = coordX * tiles.sizeX + (cols % 2 === 0 ? -1 : 0) * tiles.sizeX / 2;
            piece.y = coordY * tiles.sizeY + (rows % 2 === 0 ? -1 : 0) * tiles.sizeY / 2;
            piece.placement = {x, y};
            piece.placed = millis();

            puzzle.pieces.set(`${x},${y}`, piece);
            unplaced.splice(unplaced.indexOf(piece), 1);
            placed.push(piece);

            let index = pieces.indexOf(piece);
            pieces.splice(index, 1);
            pieces.push(piece);

            if (puzzle.pieces.size === puzzle.count) onComplete();
        }
    }
}

function onComplete() {
    for (const [key, value] of puzzle.pieces) {
        let coords = key.split(',');
        let x = parseInt(coords[0]);
        let y = parseInt(coords[1]);

        if (x !== value.index.x || y !== value.index.y) return;
    }
    onSolve();
}

function onSolve() {
    console.log('solved!');

    solved = true;
    previewing = millis();

    window.parent.document.dispatchEvent(new CustomEvent('puzzleSolved', {puzzle}));

    setTimeout(() => {
        document.querySelector('.ui-popup-container').classList.remove('disabled');
        document.querySelector('.ui-container').classList.add('disabled');
    }, 3000);
}

function hint() {
    previewing = millis();
}

function toggleFullscreen(self) {
    const classList = self.querySelector('span').classList;
    classList.toggle('fullscreen');
    classList.toggle('fullscreen_exit');
    const tooltip = self.parentElement.querySelector('.tooltip-content');
    tooltip.innerText = tooltip.innerText === 'Fullscreen' ? 'Windowed' : 'Fullscreen';
    fullscreen(!fullscreen());
}

function verify() {
    verifying = true;
    for (let piece of pieces) if (piece.placed !== -1) piece.placed = millis();
    verifying = false;
}

function generate() {
    const img = document.querySelector('#url').value;
    const cols = document.querySelector('#cols').value;
    const rows = document.querySelector('#rows').value;

    const url = new URL(window.location.origin + window.location.pathname);
    if (img) url.searchParams.set('image', img);
    if (cols) url.searchParams.set('cols', cols);
    if (rows) url.searchParams.set('rows', rows);
    return url.toString();
}

class Piece {

    constructor(x, y, posX, posY) {
        this.x = posX;
        this.y = posY;
        this.width = tiles.sizeX * 1.25;
        this.height = tiles.sizeY * 1.25;
        this.dragging = false;
        this.rollover = false;
        this.placed = -1;

        this.tile = () => tiles[frame][x][y].tile;
        this.jigsaw = () => tiles[frame][x][y].jigsaw;
        this.index = {x, y};
        this.placement = {x: -1, y: -1};
    }

    draw() {
        push();
        imageMode(CENTER);

        if (this.placed === -1 && puzzle.count < 100) {
            drawingContext.shadowOffsetX = 0;
            drawingContext.shadowOffsetY = 0;
            drawingContext.shadowBlur = 20;
            drawingContext.shadowColor = '#00000055';
        }

        image(this.tile(), this.x, this.y);

        if (this.placed !== -1) {
            if (solved) {
                let deltaPreviewing = millis() - previewing;
                if (deltaPreviewing < 1500) {
                    let fade = map(sin((-(deltaPreviewing) * 0.002 + 1.5)), -1, 1, 0, 255);
                    translate(-tiles.sizeX / 2 - img.width / 2 + cropX / 2, -tiles.sizeY / 2 - img.height / 2 + cropY / 2);
                    drawJigsaw(this.placement.x, this.placement.y, 2, [...Theme.board_outline, fade]);
                }
            } else {
                image(this.jigsaw(), this.x, this.y);
            }
        }
        pop();
    }

    drawPost() {
        if (this.placed === -1) return;
        push();
        imageMode(CENTER);

        const delta = millis() - this.placed;

        if (delta < 1100) {
            let fade = map(sin(delta * 0.01), -1, 1, 0, 255);
            translate(-tiles.sizeX / 2 - img.width / 2 + cropX / 2, -tiles.sizeY / 2 - img.height / 2 + cropY / 2);

            if (this.placement.x !== this.index.x || this.placement.y !== this.index.y) drawJigsaw(this.placement.x, this.placement.y, 6, [255, 0, 0, fade]);
        }

        pop();
    }

    update() {
        this.over();

        if (this.dragging) {
            this.x = mouseX / s + this.offsetX;
            this.y = mouseY / s + this.offsetY;
        }
    }

    isOver() {
        let min = screenPosition(this.x - this.width / 2, this.y - this.height / 2);
        let max = screenPosition(this.x + this.width / 2, this.y + this.height / 2);

        return (mouseX > min.x && mouseX < max.x && mouseY > min.y && mouseY < max.y);
    }

    isInsidePuzzle() {
        return (this.x > -puzzle.width / 2 && this.x < puzzle.width / 2 && this.y > -puzzle.height / 2 && this.y < puzzle.height / 2);
    }

    matchesShape(x, y) {
        var other = tiles[frame][x][y];
        var tile = tiles[frame][this.index.x][this.index.y];

        if (other != null) {
            return (other.topCurve === tile.topCurve && other.bottomCurve === tile.bottomCurve && other.leftCurve === tile.leftCurve && other.rightCurve === tile.rightCurve);
        }
    }

    over() {
        if (this.isOver()) {
            this.rollover = true;
            if (!solved) cursor(HAND);
        } else {
            if (this.rollover) cursor(ARROW);
            this.rollover = false;
        }
    }

    pressed() {
        if (this.isOver()) {
            if (this.placed !== -1) {
                puzzle.pieces.delete(`${this.placement.x},${this.placement.y}`);
                placed.splice(placed.indexOf(this), 1);
                unplaced.push(this);
            }

            this.dragging = true;
            this.placed = -1;

            this.offsetX = this.x - mouseX / s;
            this.offsetY = this.y - mouseY / s;

            return true;
        }
        return false;
    }

    released() {
        if (this.dragging) onPieceRelease(this);
        this.dragging = false;
    }
}

function drawJigsaw(x, y, weight, stroke) {
    let tile = tiles[frame][x][y];
    let width = tiles.sizeX;
    let height = tiles.sizeY;
    let graphic = canvas._pInst;

    let drawPuzzleSide = (side, curve) => {
        drawPuzzleSideShape(false, graphic, side, curve, width, height, () => {
            graphic.noFill();
            graphic.stroke(...stroke);
            graphic.strokeWeight(weight);
        });
    }

    push();
    translate(x * width + width / 2, y * height + height / 2);
    drawPuzzleSide(TOP, tile.topCurve);
    drawPuzzleSide(BOTTOM, tile.bottomCurve);
    drawPuzzleSide(LEFT, tile.leftCurve);
    drawPuzzleSide(RIGHT, tile.rightCurve);
    pop();
}

function numFrames(img) {
    return img.numFrames() || 1;
}
