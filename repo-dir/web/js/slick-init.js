define(['jquery', 'jquery/ui', 'slick'], function ($) {
  'use strict'

  $(document).ready(function () {
    
    $(".center").slick({
      arrows: true,
      infinite: false,
      slidesToShow: 2.2,
      slidesToScroll: 1,
      autoplay: false,
      autoplaySpeed: 5000,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 2.2,
            slidesToScroll: 1
          }
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 1.1,
            slidesToScroll: 1
          }
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1.05,
            slidesToScroll: 1
          }
        }
      ]
    });

  })

})
