
jQuery(document).ready(function() {

    /*
        Background slideshow
    */
    $('.intro').backstretch([
      "/static/landing-page/img/backgrounds/1.jpg?a"
    , "/static/landing-page/img/backgrounds/2.jpg?a"
    , "/static/landing-page/img/backgrounds/3.jpg?a"
	, "/static/landing-page/img/backgrounds/4.jpg?a"
    , "/static/landing-page/img/backgrounds/5.jpg?a"
    , "/static/landing-page/img/backgrounds/6.jpg?a"
    ], {duration: 3000, fade: 750});

    //$('.about-container').backstretch("/static/landing-page/img/backgrounds/5.jpg");

    //$('.whos-behind-container').backstretch("/static/landing-page/img/backgrounds/6.jpg");

    /*
        Countdown initializer
    */
    var now = new Date(2016, 11, 18, 19, 0);
    var countTo = now.valueOf();
    $('.timer').countdown(countTo, function(event) {
    	$(this).find('.days').text(event.offset.totalDays);
    	$(this).find('.hours').text(event.offset.hours);
    	$(this).find('.minutes').text(event.offset.minutes);
    	$(this).find('.seconds').text(event.offset.seconds);
    });

    $('a[href*="#"]:not([href="#"])').click(function() {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                scrollTop: target.offset().top
            }, 1000);
                return false;
            }
        }
    });


});

