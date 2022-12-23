import router from "../../router" 
import './index.css'




function hello() {
    return <button onclick={() => {
        router.update("/?test=" + Math.random())
    }}>Hello world</button>
}

router.add("/[home]", (test) => {
    console.log(test)
    return hello()
})

router.add("404", () => {
    console.log(router.getQueryParameter("test"))
    return <p>404</p>
})


router.update()
