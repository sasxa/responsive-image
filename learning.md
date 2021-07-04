# Responsive images on the web

## TLDR

- learn basics at MDN
  [Responsive images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

- download image

  - https://unsplash.com/photos/vpOeXr5wmR4/download?force=true&w=1920
  - `images/james-harrison-vpOeXr5wmR4-unsplash.jpg`

- rename the image **_for this tutorial_** because of the file name length

  - `images/vpOeXr5wmR4.jpg` - 1920 x 1080

- resize to different sizes, for example:
  - 1600 x 1000 => 16 : 10 => 1 : 0.625
  - `images/vpOeXr5wmR4-1920.jpg` - 1920 \* 0.625 => 1920 x 1200
  - `images/vpOeXr5wmR4-1600.jpg` - 1600 \* 0.625 => 1600 x 1000
  - `images/vpOeXr5wmR4-768.jpg` - 768 \* 0.625 => 768 x 480
  - `images/vpOeXr5wmR4-480.jpg` - 480 \* 0.625 => 480 x 300
  - `images/vpOeXr5wmR4-thumb.jpg` - 256 x 256

[Resolution switching: Different sizes](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#resolution_switching_different_sizes)

```
<img
	srcset="images/vpOeXr5wmR4-480.jpg 480w,
            images/vpOeXr5wmR4-768.jpg 768w,
            images/vpOeXr5wmR4-1080.jpg 1080w"
	sizes="(max-width: 600px) 480px,
            (max-width: 800px) 768px,
            960px"
	src="images/vpOeXr5wmR4-768.jpg"
	alt="description"
/>
```

### `srcset` - Image sizes and files

When we work with `srcset` attribute we are talking about image file widths.

- Image with **intrinsic width in pixels** 480w corresponds to the file `images/vpOeXr5wmR4-480.jpg`
- Image with **intrinsic width in pixels** 768w corresponds to the file `images/vpOeXr5wmR4-768.jpg`
- Image with **intrinsic width in pixels** 1080w corresponds to the file
  `images/vpOeXr5wmR4-1080.jpg`

> **intrinsic width in pixels** uses the `w` unit, not `px`, which is image's real size, and can be
> found by inspecting the image file.

### `sizes` - How it works?

When we work with `sizes` attribute we are talking about design widths.

- For phone screen of 360px

  - media query `(max-width: 600px)` applies
  - image size `480px` from the `sizes` is selected
  - matching image size `480w` from `srcset` is selected
  - browser will download and show `images/vpOeXr5wmR4-480.jpg`

- For tablet screen of 640px

  - media query `(max-width: 800px)` applies
  - image size `768px` from the `sizes` is selected
  - matching image size `768w` from `srcset` is selected
  - browser will download and show `images/vpOeXr5wmR4-768.jpg`
  - device shows image larger then the screen

- For tablet screen of 800px

  - media query `(max-width: 800px)` applies
  - image size `768px` from the `sizes` is selected
  - matching image size `768w` from `srcset` is selected
  - browser will download and show `images/vpOeXr5wmR4-768.jpg`
  - device shows image smaller then the screen

- For laptop screen of 1366px
  - no media query applies
  - default image size `960px` from the `sizes` is selected
  - there is no matching image size in `srcset`
  - next image size `1080w` from `srcset` is selected
  - browser will download and show `images/vpOeXr5wmR4-1080.jpg`

### `src` - A fallback value

Older browsers that don't support _sizes_ and _srcset_ will use `src` attribute to load the image.
Let's use `images/vpOeXr5wmR4-768.jpg` as a fair compromise between file size and image quality.

[Resolution switching: Same size, different resolutions](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#resolution_switching_same_size_different_resolutions)

```
<img
	srcset="images/vpOeXr5wmR4-thumb.jpg,
            images/vpOeXr5wmR4-thumb-x15.jpg 1.5x,
            images/vpOeXr5wmR4-1080-x2.jpg 2x"
	src="images/vpOeXr5wmR4-768.jpg"
	alt="description"
/>
```

For devices with higher pixel density (more physical pixels then display resolution), like Retina
screens.
