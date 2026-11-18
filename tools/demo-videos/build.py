import json, subprocess, sys, os
SC=sys.argv[1]; S=json.load(open("story.json"))[SC]; J=json.load(open(f"frames-{SC}/frames.json")); F=J["frames"]
ENC=["-c:v","libx264","-crf","20","-preset","veryfast","-pix_fmt","yuv420p","-r","30"]
def run(a): subprocess.run(["ffmpeg","-y","-loglevel","error"]+a,check=True)
# 1) Bildschirmaufnahme mit echten Zeitabständen
with open(f"{SC}-list.txt","w") as f:
  for i,fr in enumerate(F):
    d=(F[i+1]["t"]-fr["t"]) if i+1<len(F) else 1.0
    f.write(f"file '{os.path.abspath(fr['fn'])}'\nduration {max(d,0.001):.4f}\n")
  f.write(f"file '{os.path.abspath(F[-1]['fn'])}'\n")
dur=F[-1]["t"]-F[0]["t"]+1.0
run(["-f","concat","-safe","0","-i",f"{SC}-list.txt","-vf","fps=30,scale=780:1520:flags=lanczos,format=yuv420p"]+ENC+[f"{SC}-screen.tmp.mp4"]); os.replace(f"{SC}-screen.tmp.mp4",f"{SC}-screen.mp4")
# 2) Hauptteil: Hintergrund + Bildschirm + Ecken + Untertitel
caps=S["caps"]; ins=["-loop","1","-i","bg.png","-i",f"{SC}-screen.mp4","-loop","1","-i","mask.png"]
for i in range(len(caps)): ins+=["-loop","1","-i",f"cap-{SC}-{i}.png"]
fc="[1:v]scale=770:1500:flags=lanczos[s];[0:v][s]overlay=155:330:shortest=1[a0];[a0][2:v]overlay=0:0[b0]"
last="b0"
for i,(t,_,_) in enumerate(caps):
  end=caps[i+1][0] if i+1<len(caps) else dur+5
  fc+=f";[{3+i}:v]format=rgba,fade=t=in:st={t}:d=0.25:alpha=1[c{i}];[{last}][c{i}]overlay=0:0:enable='between(t,{t},{end})'[o{i}]"; last=f"o{i}"
fc+=f";[{last}]fade=t=in:st=0:d=0.3:color=0xe8f3ee,format=yuv420p[v]"
run(ins+["-filter_complex",fc,"-map","[v]","-t",f"{dur:.2f}"]+ENC+[f"{SC}-main.tmp.mp4"]); os.replace(f"{SC}-main.tmp.mp4",f"{SC}-main.mp4")
# 3) Start- und Endkarte
run(["-framerate","30","-i",f"intro-{SC}.png","-vf","format=yuv420p,loop=-1:1,trim=duration=2.4,fade=t=in:st=0:d=0.3,fade=t=out:st=2.1:d=0.3:color=0xe8f3ee,setsar=1"]+ENC+[f"{SC}-intro.mp4"])
run(["-framerate","30","-i",f"outro-{SC}.png","-vf","format=yuv420p,loop=-1:1,trim=duration=3.4,fade=t=in:st=0:d=0.4:color=0xe8f3ee,setsar=1"]+ENC+[f"{SC}-outro.mp4"])
run(["-i",f"{SC}-main.mp4","-vf","setsar=1"]+ENC+[f"{SC}-main2.mp4"])
open(f"{SC}-cat.txt","w").write("".join(f"file '{os.path.abspath(x)}'\n" for x in [f"{SC}-intro.mp4",f"{SC}-main2.mp4",f"{SC}-outro.mp4"]))
run(["-f","concat","-safe","0","-i",f"{SC}-cat.txt","-c","copy",f"{SC}-v.tmp.mp4"])
# stille Tonspur (manche Plattformen erwarten eine) + schneller Start im Web
run(["-i",f"{SC}-v.tmp.mp4","-f","lavfi","-i","anullsrc=r=44100:cl=stereo","-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","32k","-shortest","-movflags","+faststart",f"{SC}.tmp.mp4"])
os.replace(f"{SC}.tmp.mp4",f"mein-kalender-{SC}.mp4"); os.remove(f"{SC}-v.tmp.mp4")
print(SC,"ok")
