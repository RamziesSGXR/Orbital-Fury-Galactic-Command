// GALACTIC COMMAND FOR WINDOWS (GC 0.91, Ramzies: "looking for an install exe"). One program, two jobs:
//
//   GalacticCommand-Setup.exe  (the download)  installs: the game (carried inside it) goes to %LOCALAPPDATA%\GalacticCommand\game,
//                              this program itself to %LOCALAPPDATA%\GalacticCommand\GalacticCommand.exe, and "Galactic Command"
//                              to the desktop and the Start menu; then it starts the game. Run it again to update; your saves stay.
//   GalacticCommand.exe        (installed)  plays: serves the game to this computer only (http://localhost:8765, nothing goes
//                              online) and opens it full screen in its own Microsoft Edge window; closing the window stops it.
//                              Touch screens (a Surface) work.
//   GalacticCommand.exe -uninstall   takes it all away again (the saves too).
//
// No admin rights, nothing else to install. Built on Linux: bash tools/app/build.sh (it zips the game into game.zip beside this file).
package main

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

//go:embed game.zip
var gameZip []byte

const port = "8765" // (keep it: the saves belong to the address the game is served from)

var (
	user32     = syscall.NewLazyDLL("user32.dll")
	messageBox = user32.NewProc("MessageBoxW")
)

func say(title, text string, flags uintptr) int {
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString(title)
	r, _, _ := messageBox.Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), flags)
	return int(r)
}

func home() string { return filepath.Join(os.Getenv("LOCALAPPDATA"), "GalacticCommand") }

func main() {
	self, _ := os.Executable()
	self, _ = filepath.Abs(self)
	h := home()
	for _, a := range os.Args[1:] {
		if strings.EqualFold(strings.TrimLeft(a, "-/"), "uninstall") {
			uninstall(h)
			return
		}
	}
	installed := filepath.Join(h, "GalacticCommand.exe")
	if strings.EqualFold(self, installed) {
		play(filepath.Join(h, "game"))
		return
	}
	install(self, h, installed)
}

func install(self, h, installed string) {
	if say("Galactic Command", "Install Orbital Fury: Galactic Command?\n\nIt goes into your user folder (no admin needed), with a shortcut on your desktop and in the Start menu. Your saves are kept if it is already installed.", 0x21) != 1 {
		return
	}
	game := filepath.Join(h, "game")
	os.RemoveAll(game)
	if err := unzip(gameZip, game); err != nil {
		say("Galactic Command", "Could not install the game:\n"+err.Error(), 0x10)
		return
	}
	if err := copyFile(self, installed); err != nil && !strings.EqualFold(self, installed) {
		say("Galactic Command", "Could not install the launcher:\n"+err.Error(), 0x10)
		return
	}
	ico := filepath.Join(game, "assets", "app", "icon.ico")
	ps := `$s = New-Object -ComObject WScript.Shell; foreach ($l in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { $k = $s.CreateShortcut((Join-Path $l 'Galactic Command.lnk')); $k.TargetPath = '` + installed + `'; $k.WorkingDirectory = '` + h + `'; $k.IconLocation = '` + ico + `'; $k.Description = 'Orbital Fury: Galactic Command'; $k.Save() }`
	c := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	c.Run()
	if say("Galactic Command", "Installed. \"Galactic Command\" is on your desktop and in the Start menu.\n\nPlay now?", 0x24) == 6 {
		exec.Command(installed).Start()
	}
}

func uninstall(h string) {
	if say("Galactic Command", "Remove Galactic Command and its saves from this computer?", 0x34) != 6 {
		return
	}
	for _, d := range []string{"Desktop", "Programs"} {
		ps := `Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path ([Environment]::GetFolderPath('` + d + `')) 'Galactic Command.lnk')`
		c := exec.Command("powershell", "-NoProfile", "-Command", ps)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		c.Run()
	}
	game := filepath.Join(h, "game")
	os.RemoveAll(game)
	os.RemoveAll(filepath.Join(h, "edge"))
	// (the running program can't delete itself: Windows does it a moment after it closes)
	c := exec.Command("cmd", "/C", "ping 127.0.0.1 -n 3 > nul & rmdir /S /Q \""+h+"\"")
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	c.Start()
	say("Galactic Command", "Galactic Command has been removed.", 0x40)
}

var types = map[string]string{".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
	".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
	".ico": "image/x-icon", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".hdr": "application/octet-stream", ".woff": "font/woff",
	".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8"}

func play(root string) {
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		say("Galactic Command", "The game's files are missing. Run the setup again.", 0x10)
		return
	}
	url := "http://localhost:" + port + "/index.html"
	ln, err := net.Listen("tcp", "127.0.0.1:"+port)
	if err != nil { // already running: just open another window onto it
		openEdge(url)
		return
	}
	var last atomic.Int64
	last.Store(time.Now().Unix())
	files := http.FileServer(http.Dir(root))
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		last.Store(time.Now().Unix())
		if t, ok := types[strings.ToLower(filepath.Ext(r.URL.Path))]; ok {
			w.Header().Set("Content-Type", t)
		}
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	})}
	go srv.Serve(ln)
	p := openEdge(url)
	if p != nil {
		start := time.Now()
		p.Wait()
		if time.Since(start) > 5*time.Second { // the window we opened has closed
			return
		}
	}
	// (Edge handed the window to one already running, or another browser has it: serve until nothing has asked for a while)
	for time.Now().Unix()-last.Load() < 600 {
		time.Sleep(5 * time.Second)
	}
}

func openEdge(url string) *os.Process {
	for _, e := range []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), os.Getenv("LOCALAPPDATA")} {
		exe := filepath.Join(e, "Microsoft", "Edge", "Application", "msedge.exe")
		if _, err := os.Stat(exe); err == nil {
			prof := filepath.Join(home(), "edge")
			os.MkdirAll(prof, 0o755)
			// (0.92.4: maximized, and the game goes full screen itself at the first tap or key; Edge's own start-fullscreen
			// could leave the window larger than a Surface's screen, cutting the interface off at its edges)
			c := exec.Command(exe, "--app="+url+"?app=1", "--user-data-dir="+prof, "--start-maximized", "--no-first-run", "--autoplay-policy=no-user-gesture-required")
			if c.Start() == nil {
				return c.Process
			}
		}
	}
	c := exec.Command("rundll32", "url.dll,FileProtocolHandler", url) // (no Edge: the default browser)
	c.Start()
	return nil
}

func unzip(data []byte, dst string) error {
	z, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}
	for _, f := range z.File {
		name := f.Name
		if i := strings.Index(name, "/"); i >= 0 { // (the zip holds one folder: its contents go straight into game)
			name = name[i+1:]
		}
		if name == "" {
			continue
		}
		p := filepath.Join(dst, filepath.FromSlash(name))
		if !strings.HasPrefix(p, filepath.Clean(dst)+string(os.PathSeparator)) {
			return fmt.Errorf("bad path in the game's files: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			os.MkdirAll(p, 0o755)
			continue
		}
		os.MkdirAll(filepath.Dir(p), 0o755)
		r, err := f.Open()
		if err != nil {
			return err
		}
		w, err := os.Create(p)
		if err != nil {
			r.Close()
			return err
		}
		_, err = io.Copy(w, r)
		r.Close()
		w.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	if strings.EqualFold(src, dst) {
		return nil
	}
	os.MkdirAll(filepath.Dir(dst), 0o755)
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	tmp := dst + ".new"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err = io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	out.Close()
	os.Remove(dst)
	return os.Rename(tmp, dst)
}
