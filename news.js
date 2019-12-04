const express = require('express')
const consolidate = require('consolidate')
const path = require('path')
const helpers = require('handlebars-helpers')()
const cheerio = require('cheerio')
const cookieParser = require('cookie-parser')
const rp = require('request-promise')
const app = express()

const sortNews = {type:'', count: 0}

app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.engine('hbs', consolidate.handlebars)
app.set('view engine' , 'hbs')
app.set('views', path.resolve(__dirname, 'views'))

app.use('/clear-cookie', (req, res, next) => {
    res.clearCookie('userNews')
    res.redirect(301,'/')
})

const rpReq = (meth, uriPart) => new Promise((res, rej) => {
    const allNews = {}
    rp({
        method: meth,
        uri: `https://8sidor.se/kategori/${uriPart}/`,
        json: true,
    }).then(data => {
        const news = cheerio.load(data)
        allNews.title = `${news('head > title').text()}`
        allNews.news = []
        news('body > div.container.main-content > div.row.row-equal-height > div.col-md-8.blog-main > article.article-medium > h2 > a').each((index, el) => {
            allNews.news.push({title: el.children[0].data})
        })
        news('body > div.container.main-content > div.row.row-equal-height > div.col-md-8.blog-main > article.article-medium > .row > .col-sm-pull-6 > .excerpt > div > p').each((ind, el) => {
            let content =''
            el.children.forEach((el, index) => { if(index%2 === 0) content += el.data })
            allNews.news[ind].content = content
        })
        res(allNews)
    })
})

app.post('/news', (req, resp) => {
    sortNews.type = req.body.select
    rpReq('POST', sortNews.type).then(data => {
        sortNews.count = data.quantity = req.body.count
        data.newsType = sortNews.type
        resp.render('news', data)
        resp.cookie('userNews', sortNews)
    })
})

app.get('/news', (req, resp) => {
    !req.body.select && req.cookies.userNews ? sortNews.type = req.cookies.userNews.type : sortNews.type = 'vardags'
    rpReq('GET', sortNews.type).then(data => {
        req.cookies.userNews?data.quantity = req.cookies.userNews.count:data.quantity = data.news.length
        data.newsType = sortNews.type
        resp.render('news', data)
    })
})

app.get('/', (req, res) => {
    res.send(`<a href='./news' style="text-align: center; display: block">News</a><hr><a href='./clear-cookie' style="text-align: center; display: block">clear cookie</a>`)
})

app.listen(4444, () => console.log("Example app listen on port 4444"))