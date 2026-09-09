package logger

import (
	"log"
	"os"
)

type LogLevel int

const (
	LevelLight LogLevel = iota
	LevelNormal
	LevelDebug
)

var currentLevel = LevelNormal

func Init() {
	lvl := os.Getenv("LOG_LEVEL")
	switch lvl {
	case "light":
		currentLevel = LevelLight
	case "debug":
		currentLevel = LevelDebug
	default:
		currentLevel = LevelNormal
	}
}

func Info(format string, v ...interface{}) {
	if currentLevel >= LevelNormal {
		log.Printf("[INFO] "+format, v...)
	}
}

func Debug(format string, v ...interface{}) {
	if currentLevel >= LevelDebug {
		log.Printf("[DEBUG] "+format, v...)
	}
}

func Error(format string, v ...interface{}) {
	// Always log errors
	log.Printf("[ERROR] "+format, v...)
}

func Fatal(format string, v ...interface{}) {
	log.Fatalf("[FATAL] "+format, v...)
}
