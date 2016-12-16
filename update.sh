#!/usr/bin/env bash

git pull
bower install
lwot build express
lwot express forever start --silent