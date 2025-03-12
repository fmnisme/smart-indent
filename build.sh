#! /bin/bash
npm run compile
vsce package

#管理页面： https://marketplace.visualstudio.com/manage/publishers/fmnisme/extensions/smart-indent/hub?_a=acquisition
vsce publish