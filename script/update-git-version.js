#!/usr/bin/env node

/*
 * This is a simple node.js script to update the Git version in _config.yml
 */

const fs = require('fs')

const die = (err) => {
  console.log(err)
  process.exit(1)
}

const updateVersion = (version, date) => {
  fs.readFile('_config.yml', 'utf8', (err, data) => {
    if (err)
      die(err)
    data = data
      .replace(/^(latest_version: )"[^"]+"$/gm, `$1"${version}"`)
      .replace(/^(latest_relnote_url: )"[^"]+"$/gm, `$1"https://raw.github.com/git/git/master/Documentation/RelNotes/${version}.txt"`)
      .replace(/^(latest_release_date: )"[^"]+"$/gm, `$1"${date}"`)
    fs.writeFileSync('_config.yml', data)
  })
}

const autoUpdate = () => {
  const https = require('https')
  const fetchJSON = (url, callback) => {
    const match = url.match(/https:\/\/([^/]+)(\/.*)$/)
    if (!match)
      die(`Could not parse URL '${url}'`)

    let body = ''
    https.get({
              hostname: match[1],
              path: match[2],
              headers: {
                'User-Agent': 'git-scm version updater'
              }
    }, (res) => {
      if (res.statusCode != 200)
        die(res)
      res.on('data', (data) => {
        body += data.toString()
      })
      res.on('end', () => {
        callback(JSON.parse(body))
      })
    })
  }

  fetchJSON('https://api.github.com/repos/git/git/tags', (versions) => {
    versions.sort((a, b) => {
      const x = a.name.replace(/^v/, '').split('.').map(e => parseInt(e))
      const y = b.name.replace(/^v/, '').split('.').map(e => parseInt(e))
      let i = 0
      for (; i < x.length && i < y.length; i++)
        if (x[i] != y[i]) return y[i] - x[i]
      if (i < x.length) return +1
      if (i < y.length) return -1
      return 0
    })
    const latest = versions[0]
    const version = latest.name.replace(/^v/, '')
    fetchJSON(`https://api.github.com/repos/git/git/git/ref/tags/${latest.name}`, (tag) => {

      fetchJSON(`https://api.github.com/repos/git/git/git/tags/${tag.object.sha}`, (tag) => {
        const match = tag.tagger.date.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z$/)
        if (!match)
          die(`Could not parse tagger date ${tag.tagger.date}`)
        const date = match[1]

        console.log(`Determined latest version ${version} tagged on ${date}`)
        updateVersion(version, date)
      })
    })
  })
}

if (process.argv.length === 2 ||
    (process.argv.length === 3 && '--auto' === process.argv[2]))
  autoUpdate()
else if (process.argv.length === 4)
  updateVersion(process.argv[2], process.argv[3])
else
  die('Usage: node ' + process.argv[1]
      + ' ([--auto] | <version> <date> <url>\n')

