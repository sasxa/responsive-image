# Responsive images

    [➖] TODO: intro
    [✖️] explain usage
    [✔️] example config
    [✔️] explain internals
    [✖️] implement with Svelte
    [❌] inline base64 with SvelteKit

---

## Usage

```
yarn build
```

---

## Configuration

```
{
  searchPaths: ['src/assets/images', 'tmp/testing/samples'],
  cachePath: 'src/assets/.cache',
  outputPath: 'static',
  baseUrl: 'images',
  tasks: [
    {
      format: 'base64',
      sizes: [256],
      aspectRatio: 1,
      options: basic.base64Options,
    },
    {
      format: 'jpeg',
      sizes: [480, 768, 1280, 1920],
      aspectRatio: 16 / 10,
      options: basic.jpegOptions,
    },
    {
      format: 'webp',
      sizes: [480, 768, 1280, 1920],
      aspectRatio: 16 / 10,
      options: basic.webpOptions,
    },
    {
      format: 'png',
      sizes: [256],
      aspectRatio: 1,
      options: basic.pngOptions,
    },
  ]
};
```

## How it works?

-- look for images in `src/assets/images` and `tmp/testing/samples`

- image `sample-image.jpg` found

-- load cached data from `src/assets/.cache`

- look for `src/assets/.cache/sample-image.jpg.json`
- if found skip resizing task
- if not found run resizing tasks

-- Task 1: format `base64`

- resize image to 256 x 256 (in memory)
- if resized image size is less then 10KB (`task.options.inlineBelow: 10000`)
- generate inline image data `data:image/png;base64,/9j/2wBDAAYE ... yKbZQI//9k=`
- save task cache into `src/assets/.cache/sample-image.jpg.json`

-- Task 2: format `jpeg`

- resize image to 480 x 300 and save it to `static/images/sample-image_480.jpg`
- resize image to 768 x 480 and save it to `static/images/sample-image_768.jpg`
- resize image to 1280 x 800 and save it to `static/images/sample-image_1280.jpg`
- resize image to 1920 x 1200 and save it to `static/images/sample-image_1920.jpg`

      `srcset`:`images/sample-image_480.jpg 480w,
                images/sample-image_768.jpg 768w,
                images/sample-image_1280.jpg 1280w,
                images/sample-image_1920.jpg 1920w`

- save `srcset` and paths info into `static/images/sample-image.jpg.json`
- save task cache into `src/assets/.cache/sample-image.jpg.json`

-- Task 3: format `webp`

- resize image to 480 x 300 and save it to `static/images/sample-image_480.webp`
- resize image to 768 x 480 and save it to `static/images/sample-image_768.webp`
- resize image to 1280 x 800 and save it to `static/images/sample-image_1280.webp`
- resize image to 1920 x 1200 and save it to `static/images/sample-image_1920.webp`

      `srcset`:`images/sample-image_480.webp 480w,
                images/sample-image_768.webp 768w,
                images/sample-image_1280.webp 1280w,
                images/sample-image_1920.webp 1920w`

- save `srcset` and paths info into `static/images/sample-image.jpg.json`
- save task cache into `src/assets/.cache/sample-image.jpg.json`

-- Task 4: format `png`

- resize image to 256 x 256 and save it to `static/images/sample-image_256.png`

      `srcset`:`images/sample-image_256.png 256w`

- save `srcset` and paths info into `static/images/sample-image.jpg.json`
- save task cache into `src/assets/.cache/sample-image.jpg.json`

---

### Image info `static/images/sample-image.jpg.json`

<details>

```
{
  "todo": "todo"
}
```

</details>

### Task cache `src/assets/.cache/sample-image.jpg.json`

<details>

```
[
  {
    "format": "png",
    "width": 256,
    "height": 256,
    "size": 93685,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_256.png",
      "srcset": "images/sample-image_256.png 256w",
      "url": "images/sample-image_256.png",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "webp",
    "width": 1920,
    "height": 1200,
    "size": 49568,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_1920.webp",
      "srcset": "images/sample-image_1920.webp 1920w",
      "url": "images/sample-image_1920.webp",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "webp",
    "width": 1280,
    "height": 800,
    "size": 22294,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_1280.webp",
      "srcset": "images/sample-image_1280.webp 1280w",
      "url": "images/sample-image_1280.webp",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "webp",
    "width": 768,
    "height": 480,
    "size": 9874,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_768.webp",
      "srcset": "images/sample-image_768.webp 768w",
      "url": "images/sample-image_768.webp",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "webp",
    "width": 480,
    "height": 300,
    "size": 5100,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_480.webp",
      "srcset": "images/sample-image_480.webp 480w",
      "url": "images/sample-image_480.webp",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "jpeg",
    "width": 1920,
    "height": 1200,
    "size": 123544,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_1920.jpeg",
      "srcset": "images/sample-image_1920.jpeg 1920w",
      "url": "images/sample-image_1920.jpeg",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "jpeg",
    "width": 1280,
    "height": 800,
    "size": 57131,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_1280.jpeg",
      "srcset": "images/sample-image_1280.jpeg 1280w",
      "url": "images/sample-image_1280.jpeg",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "jpeg",
    "width": 768,
    "height": 480,
    "size": 23769,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_768.jpeg",
      "srcset": "images/sample-image_768.jpeg 768w",
      "url": "images/sample-image_768.jpeg",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "jpeg",
    "width": 480,
    "height": 300,
    "size": 11525,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_480.jpeg",
      "srcset": "images/sample-image_480.jpeg 480w",
      "url": "images/sample-image_480.jpeg",
      "sourceName": "sample-image.jpg"
    }
  },
  {
    "format": "jpeg",
    "width": 256,
    "height": 256,
    "size": 5636,
    "hasAlpha": false,
    "paths": {
      "sourcePath": "tmp/testing/samples/sample-image.jpg",
      "outputPath": "static/images/sample-image_256.base64",
      "url": "data:image/png;base64,/9j/2wBDAAYE ... yKbZQI//9k=",
      "sourceName": "sample-image.jpg"
    }
  }
]
```

</details>

---

## TODO: Component API

```
<Image
  src="https://unsplash.com/photos/vpOeXr5wmR4/"
  alt="description">

<Image
  src="images/sample-image.jpg"
  alt="description">
```

### Rendered HTML

```
<picture>
  <source srcset="images/sample-image_480.webp 480w,
                  images/sample-image_768.webp 768w,
                  images/sample-image_1280.webp 1280w,
                  images/sample-image_1920.webp 1920w" />
  <img  src="data:image/png;base64,/9j/2wBDAAYE ... yKbZQI//9k="
        srcset="images/sample-image_480.jpg 480w,
                images/sample-image_768.jpg 768w,
                images/sample-image_1280.jpg 1280w,
                images/sample-image_1920.jpg 1920w" />
</picture>

```
