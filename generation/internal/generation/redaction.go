package generation

import (
	"os"
	"regexp"
	"strings"
)

const redactedSecretPlaceholder = "[redacted]"

var secretPatternRedactions = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{
		pattern:     regexp.MustCompile(`(?i)\b(authorization\s*[:=]\s*)(?:Bearer\s+)?[A-Za-z0-9._~+/=-]+`),
		replacement: "${1}" + redactedSecretPlaceholder,
	},
	{
		pattern:     regexp.MustCompile(`(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+`),
		replacement: "Bearer " + redactedSecretPlaceholder,
	},
	{
		pattern:     regexp.MustCompile(`(?i)\b(api[_ -]?key|api[_ -]?token|access[_ -]?token|token|secret)\s*[:=]\s*["']?[^"',\s}\]]+["']?`),
		replacement: "${1}: " + redactedSecretPlaceholder,
	},
}

func redactGenerationSecrets(message string, additionalSecrets ...string) string {
	if message == "" {
		return ""
	}

	redacted := message
	for _, rule := range secretPatternRedactions {
		redacted = rule.pattern.ReplaceAllString(redacted, rule.replacement)
	}

	for _, secret := range knownSecretValues(additionalSecrets...) {
		redacted = strings.ReplaceAll(redacted, secret, redactedSecretPlaceholder)
	}

	return redacted
}

func knownSecretValues(additionalSecrets ...string) []string {
	candidates := append([]string{}, additionalSecrets...)
	for _, envName := range []string{ReplicateAPITokenEnvName} {
		candidates = append(candidates, os.Getenv(envName))
	}

	values := make([]string, 0, len(candidates))
	seen := map[string]struct{}{}
	for _, candidate := range candidates {
		trimmed := strings.TrimSpace(candidate)
		if len(trimmed) < 4 {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		values = append(values, trimmed)
	}
	return values
}
