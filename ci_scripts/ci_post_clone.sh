#!/bin/sh
set -e

echo "Installing JavaScript dependencies..."
npm install

echo "Installing CocoaPods dependencies..."
bundle install
cd ios
bundle exec pod install
