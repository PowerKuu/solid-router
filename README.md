# Solid/vite-router

Use npm: ```npm install @klevn/solid-router```

## Example router
```tsx
import { router } from "@klevn/solid-router" 

router.add("/", async () => {
    return <div>Hello world</div>
})

router.add("/foo/[dynamic]", ({dynamic}) => {
    return <div>{dynamic}</div>
})

router.add("404", ({dynamic}) => {
    return <p>404</p>
})
// Important
router.update()
```
