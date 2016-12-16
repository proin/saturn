#!/usr/bin/env bash

git pull
lwot install
bower install
lwot build express
lwot express forever start --silent