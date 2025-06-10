#!/usr/bin/env bash

rm -rf dist
mkdir dist
npx tsc
cp ./silero_vad_legacy.onnx dist
cp ./silero_vad_v5.onnx dist