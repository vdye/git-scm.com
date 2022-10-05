#!/usr/bin/env ruby

# This is a simple node.js script to update the Git version in _config.yml

require "octokit"
require "yaml"

def self.version_to_num(version)
  version_int = 0.0
  mult = 1_000_000
  numbers = version.to_s.split(".")
  numbers.each do |x|
    version_int += x.to_f * mult
    mult /= 100.0
  end
  version_int
end

octokit = Octokit::Client.new(access_token: ENV.fetch("GITHUB_API_TOKEN", nil))
tags = octokit.tags("git/git").sort_by { |tag| -version_to_num(tag.first[1..]) }
version = tags[0].name.gsub(/^v/, "")

ref = octokit.ref("git/git", "tags/#{tags[0].name}")
tag = octokit.tag("git/git", ref.object.sha)
date = tag.tagger.date

config = YAML.load_file("_config.yml")
config["latest_version"] = version
config["latest_relnote_url"] = "https://raw.github.com/git/git/master/Documentation/RelNotes/#{version}.txt"
config["latest_release_date"] = date.strftime("%Y-%m-%d")
yaml = YAML.dump(config).gsub(/ *$/, "")
File.write("_config.yml", yaml)