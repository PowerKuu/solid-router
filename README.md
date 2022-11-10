# Solid/vite-router

## Example router
```tsx
import { router } from "@klevn/solid-router" 

router.add("/", () => {
    return <div>Hello world</div>
})

router.add("/foo/[dynamic]", ({dynamic}) => {
    return <div>{dynamic}</div>
})

router.add("/bar/*", () => {
    return <div>Hello world with match all path</div>
})

// Important
router.update()
```

## Example route
```tsx
import { Route } from "@klevn/solid-router" 

export deafult function Component(){
  return <Route path="/foo">Click me</Route>
}
```
