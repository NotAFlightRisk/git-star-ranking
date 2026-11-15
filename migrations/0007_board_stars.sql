CREATE INDEX owners_board ON owners (kind, stars DESC) WHERE hidden = 0 AND refreshed_at > 0 AND stars > 0;
CREATE INDEX repos_stars ON repos (stars DESC);
