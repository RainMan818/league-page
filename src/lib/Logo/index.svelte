<script>
    console.log("logo");
</script>

<div>
  <img src="http://www.sports-logos-screensavers.com/user/NFL_Logo_New.jpg" />

  <div class="logo-wrapper">
    <div class="logo-top">
      <div class="logo-inner">
        <div class="star-five" />
        <div class="logo-center-white" />
      </div>
      <div class="top-left" />
      <div class="top-left-second" />
      <div class="top-right" />
      <div class="top-right-second" />
    </div>
    <div class="logo-bottom">
      <div class="blue-band">
        <div class="one" />
        <div class="two" />
        <div class="three" />
        <div class="four" />
      </div>
      <div class="white-band">
        <div class="one" />
        <div class="two" />
        <div class="three" />
        <div class="four" />
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  img {
    width: 40rem;
  }
  html {
    font-size: 10.5px;
  }
  .blue {
    background: #003567;
  }
  .red {
    background: #c80016;
  }

  .logo-wrapper {
    width: 40rem;
    height: 0px;
    padding-bottom: 30rem;
    background: #003567;
    overflow: hidden;
  }

  .logo-top {
    position: relative;
    width: 20rem;
    margin: 0px auto;
    height: 0px;
    padding-bottom: 22rem;
    background: #fff;
    top: 0;
    overflow: hidden;
  }

  .logo-inner {
    position: absolute;
    left: 0.6rem;
    right: 0.6rem;
    top: 0rem;
    padding-bottom: 22rem;
    background: #003567;
    width: 18.8rem;
  }
  .logo-center-white {
    background: #fff;
    position: absolute;
    bottom: 0rem;
    top: 13rem;
    right: 1rem;
    left: 1rem;
  }

  .top-right,
  .top-left {
    background: #fff;
    height: 0px;
    width: 12rem;
    padding-bottom: 10rem;
    border-radius: 50% 50%;
    position: absolute;
    top: -4.4rem;
    z-index: 1;
  }
  .top-right {
    right: -1.55rem;
    transform: rotate(5deg);
  }

  .top-left {
    left: -1.55rem;
    transform: rotate(-5deg);
  }

  .top-right-second,
  .top-left-second {
    background: #003567;
    height: 0px;
    width: 11.25rem;
    padding-bottom: 10.35rem;
    position: absolute;
    top: -5.35em;
    z-index: 2;
  }

  .top-right-second {
    right: -1.15rem;
    transform: rotate(5deg);
    border-radius: 45% 50%;
  }

  .top-left-second {
    left: -1.15rem;
    transform: rotate(-5deg);
    border-radius: 50% 45%;
  }

  .logo-bottom {
    position: relative;
    width: 20rem;
    margin: 0px auto;
    height: 0;
    top: 0rem;
    padding-bottom: 5rem;
  }

  .white-band {
    position: relative;
    width: 20rem;
    margin: 0px auto;
    height: 0;
    top: -3.65rem;
    padding-bottom: 7.57rem;

    .one,
    .two,
    .three,
    .four {
      position: absolute;
      width: 5.75rem;
      padding-bottom: 4rem;
      box-sizing: border-box;
      z-index: 2;
    }

    .four {
      top: 0rem;
      right: 0rem;
      border-bottom: 0.6rem solid #fff;
      border-right: 0.6rem solid #fff;
      border-bottom-right-radius: 100% 90%;
    }
    .three {
      bottom: -1rem;
      right: 5rem;
      border-top: 0.6rem solid #fff;
      border-left: 0.6rem solid #fff;
      border-top-left-radius: 100% 100%;
      background-color: #003567;

      &:before {
        height: 1rem;
        width: 2rem;
        content: "";
        position: absolute;
        background: #003567;
        bottom: 0.25rem;
        left: -0.7rem;
        z-index: 500;
        transform: rotate(-50deg);
      }
      &:after {
        height: 1rem;
        width: 2rem;
        content: "";
        position: absolute;
        background: #003567;
        bottom: 0.75rem;
        left: -1.3rem;
        z-index: 500;
        transform: rotate(50deg);
      }
    }
    .two {
      bottom: -1rem;
      left: 5rem;
      border-top: 0.6rem solid #fff;
      border-right: 0.6rem solid #fff;
      border-top-right-radius: 100% 100%;
      background-color: #003567;
    }
    .one {
      top: 0%;
      left: 0%;
      border-bottom: 0.6rem solid #fff;
      border-left: 0.6rem solid #fff;
      border-bottom-left-radius: 100% 90%;
    }
  }

  .blue-band {
    position: relative;
    width: 18.7rem;
    margin: 0px auto;
    height: 0;
    top: 0rem;
    padding-bottom: 3.65rem;

    &:before {
      background: #fff;
      content: "";
      width: 10rem;
      left: 5rem;
      height: 2.5rem;
      position: absolute;
    }
    &:after {
      content: "";
      width: 0%;
      height: 0%;
      border-top: 3rem solid #fff;
      border-left: 8rem solid transparent;
      border-right: 8rem solid transparent;
      position: absolute;
      left: calc(50% - 7.95rem);
      bottom: -1.5rem;
      z-index: 0;
    }

    .one,
    .two,
    .three,
    .four {
      position: absolute;
      width: 5.25rem;
      padding-bottom: 3.23rem;
      box-sizing: border-box;
      z-index: 1;
    }

    .four {
      top: 0rem;
      right: 0rem;
      border-bottom: 1rem solid #003567;
      border-right: 1rem solid #003567;
      border-bottom-right-radius: 100% 90%;
      background: #fff;
    }
    .three {
      bottom: -3.75rem;
      right: 5rem;
      border-top: 1rem solid #003567;
      border-left: 1rem solid #003567;
      border-top-left-radius: 100% 90%;
    }
    .two {
      bottom: -3.75rem;
      left: 5rem;
      border-top: 1rem solid #003567;
      border-right: 1rem solid #003567;
      border-top-right-radius: 100% 90%;
    }
    .one {
      top: 0;
      left: 0;
      border-bottom: 1rem solid #003567;
      border-left: 1rem solid #003567;
      border-bottom-left-radius: 100% 90%;
      background: #fff;
    }
  }
</style>
