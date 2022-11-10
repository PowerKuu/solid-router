import { JSX } from 'solid-js'
import { render } from 'solid-js/web'

import NanoEventEmitter from './utils/events'
import normalizePath from './utils/normalize'
import uuid4 from './utils/uuid'


type MatchResultType = {
    match: boolean
    dynamic?: Object
}

type PathCallbackType = (dynamic:any) => JSX.Element|Promise<JSX.Element>|void

type PathType = ({
    add: (source:string) => Promise<boolean>,
    clear: () => void

    priority: number
})

interface RouterEventsType {
    "load": (path: string, error: boolean) => void,
    "path": (path: string) => void,
    "404": (path: string) => void,
}

interface OptionsType {
    source: string,
    search: string,
    lowercase: boolean,
    fallback: RouterEventsType["404"],
}

interface FilterTypes {
    "probability": number,
    "user-agent": string[],
    "ip": string[],
    "hostname": string[],
    "city": string[],
    "region": string[],
    "country": string[],
    "loc": string[],
    "org": string[],
    "postal": string[],
    "timezone": string[],
}

interface InfoType {
    "ip": string,
    "hostname": string,
    "city": string,
    "region": string,
    "country": string,
    "loc": string,
    "org": string,
    "postal": string,
    "timezone": string,
}

interface LanguageMapType {
    [key: string]: {
        [lang: string]: any
    }
}

interface StateType {
    path: string,
    search: string,
}

// Deaclear variables
const ipInfoUrl = "https://ipinfo.io/json"

export const deafultOptions:OptionsType = {
    source: window.location.pathname,
    search: window.location.search,
    lowercase: false,

    fallback: () => {}
}

//

export class _Router extends NanoEventEmitter<RouterEventsType> {
    private options: OptionsType = deafultOptions
    registeredPaths: PathType[] = []
    language: string

    path?: string 
    search?: string

    dynamic:Object

    constructor(){
        super()
        this.language = navigator.language || navigator["userLanguage"]
        window.onpopstate = (event:PopStateEvent) => this.onPathState.bind(this)(event.state)
    }

    public define(options:Partial<OptionsType>) {
        this.options.source = options.source ?? deafultOptions.source
        this.options.search = options.search ?? deafultOptions.search
        this.options.lowercase = options.lowercase ?? deafultOptions.lowercase
        
        if (options.fallback) {
            //! Remvoe the event listener if it exists
            if (this.options.fallback) this.options.fallback("")
            this.options.fallback = this.on("404", (path) => {
                if (!options.fallback) return
                options.fallback(path)
            })
        }
    }

    public async userInfo(): Promise<InfoType|false>{
        const ipInfoFetch = await fetch(ipInfoUrl)
        if (ipInfoFetch.status != 200) return false
        const ipInfo = await ipInfoFetch.json()

        return ipInfo
    }

    public async userFilter<FilterType extends keyof FilterTypes>(filter:FilterType, options:FilterTypes[FilterType]):Promise<boolean> {
        const ipInfo = await this.userInfo()
        if (!ipInfo) return false

        const includes = (match:string) => (options as any).includes(ipInfo[match as string])
        
        switch (filter) {
            case "probability":
                return Math.random() < options
            case "user-agent":
                return (options as any).includes(navigator.userAgent)
            case "ip": 
                return includes("ip")
            case "hostname": 
                return includes("hostname")
            case "city": 
                return includes("city")
            case "region": 
                return includes("region")
            case "country": 
                return includes("country")
            case "loc": 
                return includes("loc")
            case "org": 
                return includes("org")
            case "postal": 
                return includes("postal")
            case "timezone": 
                return includes("timezone")
        }

        return false
    }

    public getQuery (id: string): string {
        return new Proxy(new URLSearchParams(this.search), {
            get: (searchParams, prop) => searchParams.get(String(prop)),
        })[id]
    }



    public add(match:string, callback:PathCallbackType, query:string = "#app", clearInject:boolean = true, priority:number = 0) {
        const clear = () => {
            const inject = document.querySelector(query)
            if (clearInject && inject) inject.innerHTML = ""
        }

        const add = async (source:string) => {
            const matchResult = this.matchPath(match, source)
            const inject = document.querySelector(query)

            if (matchResult.match) {
                const dynamicCallback = matchResult.dynamic ?? undefined
                this.dynamic = dynamicCallback
                const returnJSX = await callback(dynamicCallback)

                if (returnJSX && inject) render(() => returnJSX, inject)

                return true
            }
        }

        this.registeredPaths.push({clear, add, priority})
        return {add, clear}
    }

    public async update(path: string = this.options.source, search: string | undefined = "", update: boolean = true) {  
        path = normalizePath(path)
        
        const fullPath = search === "" || !search ? (path === this.path || !this.path ? (path + this.options.search) : path) : path + search

        window.history.pushState({path, search}, "", fullPath)
        if (update) this.onPathState({path, search})
    } 
  
    private async onPathState(state: Partial<StateType>) {
        if (!state) return
        const {path, search} = state

        const registeredPathsStorted = this.registeredPaths.sort((a, b) => a.priority - b.priority)
        const calls:boolean[] = []

        const loweredPath = this.options.lowercase ? path.toLowerCase() : path
        this.emit("path", path)

        for(var registeredPath of registeredPathsStorted) {
            registeredPath.clear()
        }

        for(var registeredPath of registeredPathsStorted) {
            const valid = await registeredPath.add(loweredPath)
            calls.push(valid)
        }   

        this.search = search
        this.path = path

        const error = !calls.includes(true)

        if (error) this.emit("404", path)

        this.emit("load", path, error)
    }


    private matchPath(match:string, source: string): MatchResultType {
        match = normalizePath(match)
        source = normalizePath(source)

        const dynamicMatch = /\[(\w+)\]/g
        const star = /\*/g

        const regexString = match.replaceAll(dynamicMatch, '([^/]+)').replaceAll(star, '[\\s\\S]*')
        const matchRawArray = [
            ...source.matchAll(
                new RegExp(regexString, "g")
            )
        ]

        const dynamicArray = [
            ["", ""],
            ...match.matchAll(dynamicMatch)
        ].map(([_, dynamic]) => {return dynamic})

        if (matchRawArray.length <= 0) return {match: false}
        const valid = matchRawArray[0][0] === source


        if (!valid) return {match: false}

        if (dynamicArray.length <= 0) return {match: true}

        const matchArray = matchRawArray[0]
        if (matchArray.length != dynamicArray.length) return {match: false}
  
        const map = {}

        matchArray.forEach((value, index) => {
            if (index == 0) return
            map[dynamicArray[index]] = decodeURIComponent(value)
        })  
        
        return {match: true, dynamic: map}
    }
}

// Create singelton
export const router = new _Router()
export default router
//

export class _LanguageManger {
    private map: LanguageMapType = {}
    public source = router.language

    public setSource(source: string = router.language) {
        this.source = source
    }

    public add(language: LanguageMapType) {
        this.map = {...this.map, ...language}
    }

    public get(code: string) {
        return this.map[code][this.source]
    }

    public clear(){
        this.map = {}
    }

}

// Create singelton
export const language = new _LanguageManger()
//


// Components
interface LinkAttr {path?: string, search?: string, update?: boolean, children:any}
interface RouteAttr {match: string, clearInject?: boolean, priority?: number, children:any}

const UUID = uuid4()

export function Link({path, search, update, children}:LinkAttr) {
    return <span onclick = {() => {router.update(path, search, update)}}>{children}</span>
}

export function Router() {
    return <span id={UUID}></span>
}

export function Route({match, clearInject, priority, children}:RouteAttr) {
    router.add(match, () => {
        return children
    }, `#${UUID}`, clearInject, priority)
}
//
