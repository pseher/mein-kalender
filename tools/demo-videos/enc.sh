set -e; SC=$1; cd "$(dirname "$0")"
node shoot.js $SC
ffmpeg -y -loglevel error -framerate 30 -i af-$SC/f%05d.jpg -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v -map 1:a -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -r 30 -c:a aac -b:a 32k -shortest -movflags +faststart $SC.tmp.mp4
mv $SC.tmp.mp4 neu-$SC.mp4; ffprobe -v error -show_entries format=duration,size -of csv=p=0 neu-$SC.mp4
