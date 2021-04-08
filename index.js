const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const yup = require('yup')
const monk = require('monk')
const { nanoid } = require('nanoid')
require('dotenv').config()

const app = express()

app.use(helmet())
app.use(cors())
app.use(morgan("tiny"))
app.use(express.json())
app.use(express.static('./public'))

const schema = yup.object().shape({
     slug: yup.string().trim().matches(/[\w\-]/i),
     url: yup.string().url().required(),
     created: yup.date().default(() => {
          return new Date()
     })
})

const db = monk(process.env.MONGODB_URI)
const urls = db.get('urls')
urls.createIndex({ slug: 1 }, { unique: true })

app.get('/:id', async (req, res, next) => {
     const { id: slug } = req.params
     try {
          const url = await urls.findOne({ slug })
          if(url) {
               res.redirect(url.url)
          }
          res.redirect(`/?error=${slug} not found`)
     } catch (error) {
          res.redirect(`/?error=Link not found`)
     }
})

app.post('/', async (req, res, next) => {
     let { slug, url } = req.body
     try {
          await schema.validate({
               slug,
               url
          })

          if (!slug) {
               slug = nanoid(5).toLowerCase()
          } else {
               const item = await urls.findOne({ slug })
               if (item) {
                    throw new Error('this slug was used, 😒')
               }
          }
          slug = slug.toLowerCase()
          const newUrls = {
               url,
               slug
          }

          const created = await urls.insert(newUrls)
          res.json(created)
     } catch (error) {
          next(error)
     }
})

app.use((error, req, res, next) => {
     if (error.status) {
          res.status(error.status)
     } else {
          res.status(500)
     }
     res.json({
          message: error.message,
          stack: process.env.NODE_ENV = 'production' ? 'hello' : error.stack
     })
})

const port = process.env.PORT || 3333
app.listen(port, () => {
     console.log(`server listening on http://localhost:${port}`)
})