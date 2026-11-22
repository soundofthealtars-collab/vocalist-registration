CREATE TABLE vocalist_events (
  id INT PRIMARY KEY,
  capacity INT UNSIGNED NOT NULL
) ENGINE=InnoDB;
INSERT INTO vocalist_events (id, capacity) VALUES (1, 120);
CREATE TABLE vocalist_registrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  whatsapp_number VARCHAR(16) NOT NULL,
  vocal_part ENUM('Soprano','Alto','Tenor','Bass','Unsure') NOT NULL,
  church_ministry VARCHAR(200) NOT NULL DEFAULT '',
  committed TINYINT(1) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_registration (event_id, whatsapp_number),
  FOREIGN KEY (event_id) REFERENCES vocalist_events(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
