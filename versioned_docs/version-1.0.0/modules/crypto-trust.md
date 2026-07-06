---
id: crypto-trust
title: crypto/envelope, mtls & trust
---

# crypto/envelope, mtls & trust — federation primitives

```go
import (
    "github.com/datakaveri/dx-common-go/crypto/envelope"
    "github.com/datakaveri/dx-common-go/mtls"
    "github.com/datakaveri/dx-common-go/trust"
)
```

## Purpose

Generic cryptographic plumbing for federated deployments (the SADx extension), dormant in core services by design:

- **`crypto/envelope`** — encrypt-then-sign message envelope: ECDH-ES (P-256) → HKDF-SHA256 → AES-256-GCM for confidentiality; ECDSA (ES256) over the ciphertext for authenticity, verified **before** decryption.
- **`trust`** — a hot-swappable trust store: CA anchors + optional CRLs, snapshot replaced atomically so trust updates take effect without dropping listeners.
- **`mtls`** — mutual-TLS configs whose trust decisions delegate to a pluggable `TrustProvider` (which `trust.Store` satisfies) evaluated per handshake.

## Public API

```go
// envelope
func GenerateKey() (*ecdsa.PrivateKey, error)
func Seal(plaintext []byte, recipientPub *ecdsa.PublicKey, signerPriv *ecdsa.PrivateKey) (string, error)
func Open(token string, recipientPriv *ecdsa.PrivateKey, signerPub *ecdsa.PublicKey) ([]byte, error)
// + Marshal/ParsePrivateKeyPEM, Marshal/ParsePublicKeyPEM, KeyID

// trust
func New(policy PolicyFunc) *Store   // PolicyFunc: extra per-leaf checks (membership, policy)
// (s *Store) atomic anchor/CRL snapshot swap + offline chain verification

// mtls
type TrustProvider interface{ /* current pool + per-peer verdict */ }
func ServerConfig(cert tls.Certificate, tp TrustProvider) (*tls.Config, error)
func ClientConfig(cert tls.Certificate, tp TrustProvider, serverName string) (*tls.Config, error)
```

## Usage

```go
sealed, err := envelope.Seal(payload, partnerPub, ourSigningKey)   // sender
plain, err := envelope.Open(sealed, ourDecryptKey, partnerSigPub)  // recipient: verify-then-decrypt

store := trust.New(nil)
// on trust-list sync: store swaps anchors atomically; live handshakes see the new set
srvTLS, err := mtls.ServerConfig(cert, store)
```

## Best practices

- Which peers/countries are admissible is *policy* — layer it via `PolicyFunc`; the store stays generic PKI.
- Keys are standard PKCS#8/PKIX PEM on P-256; manage them with the platform's secret pipeline.

## Pitfalls

- These modules are config-gated OFF in core DX; adopt them only for federated deployments.
- `Open` authenticates before decrypting — never "try decrypt anyway" on signature failure.

## Related modules

[identity](/modules/auth-identity) (intra-platform identity is HMAC headers, not mTLS).
