# piclab2020
## Graphics processing in Deno

In the late 1980s and early 90s, I wrote a program for MS-DOS called "Piclab"
that did some basic image processing. I was a scriptable command-line program
that served to compensate for the fact that I couldn't afford a fancy color-
graphics PC at the time, but I wanted to do things like print color images to
my HP PaintJet (the very first inkjet printer available to the public). I
abandoned the project when PCs with color graphics became commonplace, and
powerful software like Gimp/Photoshop became available.

But lately, I have encountered the need for image processing tasks that are
still not well-covered by existing hardware and software: HDR, for example, is
still a niche market. Video format conversion software is uniformly awful. So
I had thought once or twice of creating a new Piclab for the modern world, but
was often distracted by little things like working for a living, and not
particularly inspired by the state of software development platforms suitable
to the task--until now.

The combination of TypeScript, Deno, and Rust seems to me like the ideal
platform for creating the new tool, so that's what I'll be doing. I'll be
initially writing all the code in TypeScript for the Deno runtime, but will
likely re-work some of the inner loops in Rust/WebAssembly as needed. Like its
predecessor, it will be primarily a command-line/scripting app, but I will
likely add some kind of browser-based display and GUI capability for those
times when it is needed.

--Lee Daniel Crocker
January, 2021

