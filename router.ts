import parseUrlLib from "parse-url"

import { render } from "solid-js/web"
import { JSX } from "solid-js/jsx-runtime"

import normalizePath from "./utils/normalize"
import zip from "./utils/zip"
import NanoEventEmitter from "./utils/events"

type RouteCallback = (dynamicMap:DynamicMap) => JSX.Element|Promise<JSX.Element>|void

type ParsedURL = ReturnType<typeof parseUrl>

interface Route {
    url:string,
    parsedUrl: ParsedURL,
    callback: RouteCallback
}

interface DynamicMap {
    [key:string]: string
}

interface RouterEventsType {
    "load": (url: ParsedURL) => void,
    "update": (url: ParsedURL) => void
}

function parseUrl(url:string) {
    try {
        const parsedUrl = parseUrlLib(url, true)

        return parsedUrl
    } catch(err) {
        const parsedUrl = parseUrlLib(window.location.origin + normalizePath(url), true)

        return parsedUrl
    }
}

class Router extends NanoEventEmitter<RouterEventsType> {
    public defaultUrl = window.location.href
    public targetQuerySelector: string = "#app"

    public currentDynamicMap:DynamicMap = {}
    public currentUrl?:ParsedURL

    private routes: Route[] = []

    constructor() {
        super()

        window.onpopstate = (event:PopStateEvent) => {
            if (!event.state) return
            this.update(event.state.url, false)
        }
    }



    public add(url:string, callback:RouteCallback) {
        const parsedUrl = parseUrl(url)

        this.routes.push({
            url,
            parsedUrl,
            callback,
        })
    }

    public async update(url:string = this.defaultUrl, pushState:boolean = true) {
        this.resetScroll()
        const parsedUrl = parseUrl(url)

        this.emit("update", parsedUrl)

        if (pushState) window.history.pushState({url}, "", url)

        var route404:Route

        for (var route of this.routes) {
            if (route.url === "404") {
                route404 = route
                continue
            }

            const compare = this.compare(route.parsedUrl.pathname, parsedUrl.pathname)

            if (compare != false) {
                await this.load(route, parsedUrl, compare)
                return
            }
        }

        if (route404) await this.load(route404, parsedUrl, {})
        return
    }

    public getQueryParameter(id: string): string {
        if (!this.currentUrl) return
        return new Proxy(new URLSearchParams(this.currentUrl.search), {
            get: (searchParams, prop) => searchParams.get(String(prop)),
        })[id]
    }

    public getDynamicPath(key: string): string {
        return this.currentDynamicMap[key]
    }

    public resetScroll() {
        window.scrollTo({
            top: 0,
            left: 0
        })
    }



    private async load(route:Route, matchedUrl:ParsedURL, dynamicMap:DynamicMap) {
        this.currentUrl = matchedUrl
        this.currentDynamicMap = dynamicMap

        const element = document.querySelector(this.targetQuerySelector) as HTMLElement

        while(element.firstChild){element.removeChild(element.firstChild)}   
        
        const target = await route.callback(dynamicMap)
        if (!target) return
        
        render(() => target, element)

        this.emit("load", matchedUrl)
    }

    private compare(source:string, input:string):DynamicMap|false {
        var dynamicMap:DynamicMap = {}

        const sourceSplit = source.split("/").filter(_ => _)
        const inputSplit = input.split("/").filter(_ => _)

        for (var [sourcePath, inputPath] of zip(sourceSplit, inputSplit)) {
            if (inputPath == undefined || sourcePath == undefined) return false

            if ((/\[.*?\]/i).test(sourcePath)) {
                dynamicMap[sourcePath.slice(1,-1)] = inputPath
            } else if(inputPath !== sourcePath) { return false }
        }

        return dynamicMap
    }
}


export default new Router()