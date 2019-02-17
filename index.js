const defaults = require('defaults-es6/deep');
const {mix} = require('mixwith');
const viewportCollisionMixin = require('weddell-viewport-collision-component-mixin');

const LOAD_LIMIT = 3;
var loadQueue = [];
var done = [];

function queueLoad(component) {
    if (done.indexOf(component) > -1) {
        component.state.canLoad = true;
        return;
    }
    if (loadQueue.indexOf(component) === -1) {    
        loadQueue.push(component);
    }
    rotateQueue();
}

function resetDone(component) {
    var i = done.indexOf(component);
    if (done.indexOf(component) > -1) {
        done.splice(i, 1);
    }
    i = loadQueue.indexOf(component);
    if (loadQueue.indexOf(component) > -1) {
        loadQueue.splice(i, 1);
    }
    component.state.canLoad = false;
    rotateQueue();
}

function rotateQueue() {
    var i = 0;

    while (i < LOAD_LIMIT && i < loadQueue.length) {
        loadQueue[i].state.canLoad = true;
        i++;
    }
}

function markDone(component) {
    var i = loadQueue.indexOf(component);
    if (i > -1) {
        done.push(component);
        loadQueue.splice(i, 1);
    }
    rotateQueue();
}

function unqueueLoad(component) {
    var i = loadQueue.indexOf(component);
    if (i > -1 && i >= LOAD_LIMIT) {
        loadQueue.splice(i, 1);
    }
    rotateQueue();
}

module.exports = Component => class extends mix(Component).with(viewportCollisionMixin) {
    constructor(opts) {
        super(defaults(opts, {
            inputs: ['src', 'width', 'height'],
            state: {
                hasLoaded: false,
                errored: false,
                canLoad: false,
                aspectRatio: function() {
                    return !isNaN(this.height) && !isNaN(this.width) ? this.height / this.width : 0;
                },
                wasInViewport: false,
                width: null,
                height: null,
                currentSrc: function(){
                    return this.hasLoaded || this.canLoad ? this.src : null;
                }
            },
            markupTemplate: require('./index.pug'),
            stylesFormat: '(locals)=>CSSString',
			stylesTemplate: (locals)=>{
                return `
                    img.lazy-img.has-loaded {
                        animation: lazy-img-fade-in;
                        animation-duration: 0.5s;
                        animation-fill-mode: forwards;
                    }

                    .lazy-img.loading img {
                        max-height: 0;
                    }
                    
                    img.lazy-img:not(.has-loaded) {
                        width: 0;
                        height: 0;
                    }

                    .lazy-img.placeholder::before {
                        content: '';
                        display: block;
                    }

                    #lazy-img-${locals.$id}.placeholder::before {
                        padding-top: ${100 * (locals.aspectRatio)}%;
                    }

                    @keyframes lazy-img-fade-in {
                        from {
                            opacity: 0;
                        }  
                        to {
                            opacity: 1;
                        }
                    }
                `
            }
        }));
    }

    onInit() {
        this.state.watch('src', src => {
            resetDone(this);
            this.state.hasLoaded = false;
            this.state.errored = false;
            this.state.wasInViewport = this.state.isInViewport;
            if (this.state.isInViewport) {
                queueLoad(this);
            }
        })

        this.state.watch('isInViewport', isInViewport => {
            if (isInViewport) {
                this.state.wasInViewport = true;
                queueLoad(this);
            } else {
                unqueueLoad(this);
            }
        })
    }

    markLoaded() {
        this.state.hasLoaded = true;
        markDone(this);
    }

    markErrored() {
        this.state.errored = true;
        markDone(this);
    }
}