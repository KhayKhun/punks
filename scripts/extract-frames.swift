// Extracts every frame of a video to numbered JPEGs (no ffmpeg needed).
// Usage: swift tools/extract-frames.swift <input.mp4> <outDir> [quality 0-1]
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: swift extract-frames.swift <input> <outDir> [quality]")
  exit(1)
}
let url = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let quality = args.count > 3 ? Double(args[3])! : 0.6
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.appliesPreferredTrackTransform = true

let track = asset.tracks(withMediaType: .video).first!
let fps = Double(track.nominalFrameRate)
let duration = CMTimeGetSeconds(asset.duration)
let count = Int((duration * fps).rounded(.down))

for i in 0..<count {
  let t = CMTime(seconds: (Double(i) + 0.5) / fps, preferredTimescale: 6000)
  let img = try gen.copyCGImage(at: t, actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: img)
  let data = rep.representation(using: .jpeg, properties: [.compressionFactor: quality])!
  try data.write(to: outDir.appendingPathComponent(String(format: "%04d.jpg", i + 1)))
}
print("extracted \(count) frames at \(fps) fps")
