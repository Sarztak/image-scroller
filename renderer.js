const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const scrollContainer = document.getElementById('scroll-container');
const openButton = document.getElementById('open-button');

let images = [];
let tiles = [];
let focusedIndex = 0;
const CLONE_COUNT = 2;

//window resizer to resize the window and the images once the window is maximized
window.addEventListener('resize', () => {
    if (images.length === 0) return
    setTileDimensions()
})

openButton.addEventListener('click', () => {
    ipcRenderer.invoke('open-folder').then((folderPath) => {
        if (!folderPath) return
        loadImages(folderPath)
    })
})

// detect if we are on clones after the scroll settles
scrollContainer.addEventListener('scrollend', () => {
    if (scrollEndInitialized) {
        scrollEndInitialized = false
        return
    }

    const imageWidth = tiles[0].clientWidth
    const leftCloneEnd = Math.round(imageWidth * CLONE_COUNT)
    const rightCloneStart = Math.round((images.length + CLONE_COUNT) * imageWidth)
    const currentScroll = Math.round(scrollContainer.scrollLeft)
    console.log('scrollend fired, scrollLeft:', currentScroll)
    console.log('leftCloneEnd:', leftCloneEnd)
    console.log('rightCloneStart:', rightCloneStart)
    // scrolled into left clones
    if (currentScroll < leftCloneEnd) {
        scrollContainer.style.scrollBehavior = 'auto'
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + images.length * imageWidth
        scrollContainer.style.scrollBehavior = ''
        focusedIndex = images.length - 1
    }

    // scrolled into right clones
    if (currentScroll >= rightCloneStart) {
        scrollContainer.style.scrollBehavior = 'auto'
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
    return 'distant'
}

function updateUI(focusedIndex) {
    tiles.forEach((tile, index) => {
        console.log(index, focusedIndex)
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
}

let scrollEndInitialized = false

function buildStrip() {
    scrollContainer.innerHTML = ''
    tiles = []
    focusedIndex = 0

    // create image tiles
    images.forEach((imagePath) => {
        const tile = createTile(imagePath)
        scrollContainer.appendChild(tile)
        tiles.push(tile)
    })


    addClones() // add clones

    setTileDimensions() // set dimensions in px

    updateUI(focusedIndex) // assign initial classes


    requestAnimationFrame(() => { // scroll only after the DOM is rendered
        scrollEndInitialized = true
        scrollContainer.style.scrollBehavior = 'auto'
        scrollContainer.scrollLeft = CLONE_COUNT * tiles[0].clientWidth
        scrollContainer.style.scrollBehavior = ''
    })
}

function createTile(imagePath) {
    const tile = document.createElement('div')
    tile.className = 'image-tile'

    const img = document.createElement('img')
    img.src = imagePath

    tile.appendChild(img)
    return tile
}

function addClones() {
    for (let i = images.length - 1; i >= images.length - CLONE_COUNT; i--) {
        const clone = createTile(images[i])
        clone.dataset.clone = 'left'
        scrollContainer.prepend(clone)
    }

    for (let i = 0; i < CLONE_COUNT; i++) {
        const clone = createTile(images[i])
        clone.dataset.clone = 'right'
        scrollContainer.appendChild(clone)
    }
}

function setTileDimensions() {
    const width = window.innerWidth * 0.8
    const height = window.innerHeight * 0.9
    // the dimensions needs to be updated on all the elements including the clones not just on tiles
    document.querySelectorAll('.image-tile').forEach(tile => {
        tile.style.height = height + 'px'
        tile.style.width = width + 'px'
    })
}

