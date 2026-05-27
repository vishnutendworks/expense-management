const mix = require('laravel-mix');

/*|--------------------------------------------------------------------------
 | We set the public path directly to the core-platform's static folder.
 | When Engineer 4 runs 'npm run dev', the compiled CSS and JS are 
 | instantly available to the Django server.
 */

mix.setPublicPath('../core-platform/static');

// Compile JS and SCSS
mix.js('src/js/app.js', 'js')
    .sass('src/scss/app.scss', 'css')
    .options({
        processCssUrls: false // Prevents Mix from messing with absolute paths
    });

// Optional: Add cache-busting for production
if (mix.inProduction()) {
    mix.version();
}