const defaults = require('defaults-es6/deep');
const {mix} = require('mixwith');
const viewportCollisionMixin = require('weddell-viewport-collision-component-mixin');

module.exports = Component => class extends mix(Component).with(viewportCollisionMixin) {
    constructor(opts) {
        super(defaults(opts, {
            inputs: ['src', 'width', 'height'],
            state: {
                hasLoaded: false,
                aspectRatio: function() {
                    return !isNaN(this.height) && !isNaN(this.width) ? this.height / this.width : 0;
                },
                wasInViewport: false,
                width: null,
                height: null,
                currentSrc: function(){
                    return this.isInViewport || this.hasLoaded ? this.src : null;
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
            this.state.hasLoaded = false;
            this.state.wasInViewport = this.state.isInViewport;
        })

        this.state.watch('isInViewport', isInViewport => {
            if (isInViewport) {
                this.state.wasInViewport = true;
            }
        })
    }

    markLoaded() {
        this.state.hasLoaded = true;
    }
}