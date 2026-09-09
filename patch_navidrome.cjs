const fs = require('fs');

let content = fs.readFileSync('go-service/pkg/plugins/navidrome.go', 'utf8');

const target = `	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}`;

const replacement = `	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("http error: %d", resp.StatusCode)
	}

	var subsonicResp struct {
		SubsonicResponse struct {
			Status string \`json:"status"\`
			Error  *struct {
				Message string \`json:"message"\`
			} \`json:"error"\`
		} \`json:"subsonic-response"\`
	}
	if err := json.NewDecoder(resp.Body).Decode(&subsonicResp); err != nil {
		return false, err
	}
	if subsonicResp.SubsonicResponse.Status == "failed" {
		msg := "auth failed"
		if subsonicResp.SubsonicResponse.Error != nil {
			msg = subsonicResp.SubsonicResponse.Error.Message
		}
		return false, fmt.Errorf("navidrome api error: %s", msg)
	}

	return true, nil
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('go-service/pkg/plugins/navidrome.go', content);
    console.log("Patched!");
} else {
    console.log("Target not found!");
}
