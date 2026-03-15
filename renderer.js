const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs')

const scrollContainer = document.getElementById('scroll-container');
const openButton = document.getElementById('open-button');

let images = [];
let tiles = [];
let focusedIndex = 0;
const CLONE_COUNT = 2;

//window resizer to resize the window and the images once the window is maximized
window.addEventListener('resize', () => {
    if (images.length === 0) return
    buildStrip()
})

openButton.addEventListener('click', () => {
    ipcRenderer.invoke('open-folder').then((folderPath) => {
        if (!folderPath) return
        loadImages(folderPath)
    })
})

// detect if we are on clones after the scroll settles
scrollContainer.addEventListener('scrollend', () => {
    const imageWidth = tiles[0].clientWidth
    const leftCloneEnd = imageWidth * CLONE_COUNT
    const rightCloneStart = (images.length + CLONE_COUNT) * imageWidth

    // scrolled into left clones
    if (scrollContainer.scrollLeft < leftCloneEnd) {
        scrollContainer.style.scrollBehavior = 'auto'
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + images.length * imageWidth
        scrollContainer.style.scrollBehavior = ''
        focusedIndex = images.length - 1
    }

    // scrolled into right clones
    if (scrollContainer.scrollLeft >= rightCloneStart) {
        scrollContainer.style.scrollBehavior = 'auto'
        focusedIndex = images.length - 1
        scrollContainer.scrollLeft = scrollContainer.scrollLeft - images.length * imageWidth
        scrollContainer.style.scrollBehavior = ''
        focusedIndex = 0
    }
    updateUI(focusedIndex)
})


document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
        focusedIndex = (focusedIndex + 1) % images.length
        updateUI(focusedIndex)
        scrollToImage(focusedIndex)
    }

    if (event.key === 'ArrowLeft') {
        focusedIndex = (focusedIndex - 1 + images.length) % images.length
        updateUI(focusedIndex)
        scrollToImage(focusedIndex)
    }
})

// wheel navigation

let isScrolling = false

scrollContainer.addEventListener('wheel', (event) => {
    event.preventDefault()

    if (isScrolling) return

    isScrolling = true

    if (event.deltaY > 0) {
        focusedIndex = (focusedIndex + 1) % images.length
    } else {
        focusedIndex = (focusedIndex - 1 + images.length) % images.length
    }

    updateUI(focusedIndex)
    scrollToImage(focusedIndex)

    setTimeout(() => { isScrolling = false }, 300)
})


function getStateClass(tileIndex, focusedIndex) {
    const distance = Math.abs(tileIndex - focusedIndex)
    const circularDistance = Math.min(distance, images.length - distance)

    if (circularDistance === 0) return 'focused'
    if (circularDistance === 1) return 'adjacent'
    return 'distance'
}

function updateUI(focusedIndex) {
    tiles.forEach((tile, index) => {
        const stateClass = getStateClass(index, focusedIndex)
        tile.className = `image-tile ${stateClass}`
    })
}

function scrollToImage(index) {
    const imageWidth = tiles[0].clientWidth
    const targetScrollLeft = (CLONE_COUNT + index) * imageWidth

    scrollContainer.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
    })
}





function loadImages(folderPath) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

    images = fs.readdirSync(folderPath)
        .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
        .map(file => path.join(folderPath, file))

    if (images.length === 0) return

    buildStrip();
    setTileDimensions(); // pixels are not set correctly in electron therefore there is a padding on y which i don't want
}

function buildStrip() {
    scrollContainer.innerHTML = ''
    tiles = []
    focusedIndex = 0

    // create image tiles
    images.forEach((imagePath, index) => {
        const tile = createTile(imagePath, index)
        scrollContainer.appendChild(tile)
        tiles.push(tile)
    })

    setTileDimensions() // set dimensions in px

    addClones() // add clones

    updateUI(focusedIndex) // assign initial classes

    scrollToImage(focusedIndex) // scroll to first real image not clone

}

function createTile(imagePath, index) {
    const tile = document.createElement('div')
    tile.className = 'image-tile'

    const img = document.createElement('img')
    img.src = imagePath

    tile.appendChild(img)
    return tile
}

function addClones() {
    for (let i = images.length - CLONE_COUNT; i < images.length; i++) {
        const clone = createTile(images[i], i)
        clone.dataset.clone = 'left'
        scrollContainer.prepend(clone)
    }

    for (let i = 0; i < CLONE_COUNT; i++) {
        const clone = createTile(images[i], i)
        clone.dataset.clone = 'right'
        scrollContainer.appendChild(clone)
    }
}

function setTileDimensions() {
    const width = window.innerWidth * 0.8
    const height = window.innerHeight * 0.9
    tiles.forEach(tile => {
        tile.style.height = height + 'px'
        tile.style.width = width + 'px'
    })
}

