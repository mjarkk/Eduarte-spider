const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const jsdom = require('jsdom')
const { JSDOM } = jsdom;

const credentials = require('./credentials.json')

const LoginUrl = 'https://login.educus.nl'
const School_search = '#txtScholenZoekVeld'
const School_name = 'Alfa-college'
const School_to_select = '#organisatieLijst > li.authenticator--li.odd > a'
const Login_username = '#id6'
const Login_username_text = credentials.username
const Login_password = '#id7'
const Login_password_text = credentials.password
const Login_button = '#id4'
const Hamburger_button = '#id2'
const Agenda_url = 'https://alfacollege-student.educus.nl/agenda'
const Rooster_timetable_days = 'body > div.l-container > div > section > div.content.has-no-padding > div.agenda-list > div.l-full'
const listBtn = 'div > ul > li.is-selected'

const delay = (duration) =>
  new Promise(resolve =>
    setTimeout(resolve, duration)
  )

async function gethtmlcontent() {
  const browser = await puppeteer.launch({
    headless: false
  })
  const page = await browser.newPage()

  await page.goto(LoginUrl)
  await page.click(School_search)
  await page.keyboard.type(School_name)
  await delay(1000)
  await page.click(School_to_select)
  await page.waitForNavigation()
  await delay(500)
  await page.click(Login_username)
  await page.keyboard.type(Login_username_text)
  await page.click(Login_password)
  await page.keyboard.type(Login_password_text)
  await page.click(Login_button)
  await page.waitForNavigation()
  await delay(500)
  await page.goto(Agenda_url, {waitUntil: 'networkidle0'})
  await delay(500)
  await page.click(listBtn)
  await delay(500)
  let Rooster_html = await page.evaluate(() => document.body.innerHTML)
  fs.outputFileSync('./pagedata.html', Rooster_html)
  browser.close()
  htmltojson()
}

function htmltojson() {

  let dom = new JSDOM(fs.readFileSync('./pagedata.html', 'utf8'))
  let document = dom.window.document

  let pxToNumber = input =>
    Number(input.replace('px',''))

  let html = document.querySelector(Rooster_timetable_days)

  let table = html.querySelectorAll('tbody')

  let weekItems = []
  for ([index, item] of table.entries()) {
    let lessons = item.querySelectorAll('tbody .clickable-row')
    let dayLessons = []
    for (lesson of lessons) {
      let nameAndLocal = lesson.querySelector('td.agenda-details > span.agenda-class').innerHTML
      let lessonNumber = lesson.querySelector('td > div').innerHTML
      dayLessons.push({
        from: {
          number: Number(lessonNumber.slice(0, lessonNumber.indexOf('-'))),
          time: lesson.querySelector('td.agenda-time > span.agenda-time.top').innerHTML
        },
        to: {
          number: Number(lessonNumber.slice(lessonNumber.indexOf('-') + 1, lessonNumber.length)),
          time: lesson.querySelector('td.agenda-time > span.agenda-time.bottom').innerHTML
        },
        name: nameAndLocal.slice(0, nameAndLocal.indexOf('-') - 1),
        local: nameAndLocal.slice(nameAndLocal.indexOf('-') + 2, nameAndLocal.length),
        teatcher: lesson.querySelector('td.agenda-details > span.agenda-teacher').innerHTML
      })
    }
    weekItems.push({
      dayname: ['mo','tu','we','th','fr','sa','su'][index],
      daynumber: index + 1,
      lessons: dayLessons
    })
  }

  fs.writeJsonSync('./weekitem.json',weekItems, {spaces: 2})

}

gethtmlcontent()
// htmltojson()
