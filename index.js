const defaults = require('defaults-es6/deep');
const { mix } = require('mixwith');
const viewportCollisionMixin = require('weddell-viewport-collision-component-mixin');

const LOAD_LIMIT = 3;
var loadQueue = [];
var done = [];

function queueLoad(state) {
    if (done.indexOf(state) > -1) {
        state.canLoad = true;
        return;
    }
    if (loadQueue.indexOf(state) === -1) {
        loadQueue.push(state);
    }
    rotateQueue();
}

function resetDone(state) {
    var i = done.indexOf(state);
    if (done.indexOf(state) > -1) {
        done.splice(i, 1);
    }
    i = loadQueue.indexOf(state);
    if (loadQueue.indexOf(state) > -1) {
        loadQueue.splice(i, 1);
    }
    state.canLoad = false;
    rotateQueue();
}

function rotateQueue() {
    var i = 0;

    while (i < LOAD_LIMIT && i < loadQueue.length) {
        loadQueue[i].canLoad = true;
        i++;
    }
}

function markDone(state) {
    var i = loadQueue.indexOf(state);
    if (i > -1) {
        done.push(state);
        loadQueue.splice(i, 1);
    }
    rotateQueue();
}

function unqueueLoad(state) {
    var i = loadQueue.indexOf(state);
    if (i > -1 && i >= LOAD_LIMIT) {
        loadQueue.splice(i, 1);
    }
    rotateQueue();
}

module.exports = Component => class extends mix(Component).with(viewportCollisionMixin) {

    static get state() {
        return defaults({
            hasLoaded: false,
            errored: false,
            canLoad: false,
            aspectRatio: function () {
                return !isNaN(this.height) && !isNaN(this.width) ? this.height / this.width : 0;
            },
            wasInViewport: false,
            width: null,
            height: null,
            currentSrc: function () {
                return this.hasLoaded || this.canLoad ? this.src : null;
            }
        }, super.state);
    }

    static get markup() {
        return require('./index.pug');
    }

    static get inputs() {
        return ['src', 'width', 'height']
    }

    static get styles() {
        return [
            require('./index.css'),
            locals => `
                #lazy-img-${locals.$id}.placeholder::before {
                    padding-top: ${100 * (locals.aspectRatio)}%;
                }
            `
        ]
    }

    static get watchers() {
        return [
            [
                'src', function (src) {
                    resetDone(this);
                    this.hasLoaded = false;
                    this.errored = false;
                    this.wasInViewport = this.isInViewport;
                    if (this.isInViewport) {
                        queueLoad(this);
                    }
                }
            ],
            [
                'isInViewport', function (isInViewport) {
                    if (isInViewport) {
                        this.wasInViewport = true;
                        queueLoad(this);
                    } else {
                        unqueueLoad(this);
                    }
                }
            ]
        ]
    }

    async onMount() {
        await super.onMount()
        this.getParent().on('lazyloadimages', this.loadCallback = () => this.checkViewportCollision())
    }

    async onUnmount() {
        await super.onUnmount()
        this.getParent().off('lazyloadimages', this.loadCallback)
    }

    markLoaded() {
        this.state.hasLoaded = true;
        markDone(this.state);
    }

    markErrored() {
        this.state.errored = true;
        markDone(this.state);
    }
}