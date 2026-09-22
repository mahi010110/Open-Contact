#!/bin/bash
# Labo « deux réseaux » : un Internet (oc-inet), deux box qui font du NAT
# (oc-ra, oc-rb), un appareil derrière chacune (oc-ha, oc-hb) et un second
# appareil sur le MÊME réseau que A (oc-ha2).
#   usage : reseau.sh up [cone|symetrique]   |   reseau.sh down
set -e
NS="oc-inet oc-ra oc-rb oc-ha oc-ha2 oc-hb oc-hb2"
if [ "$1" = down ]; then
  for n in $NS; do ip netns del $n 2>/dev/null || true; done
  rm -rf /etc/netns/oc-ha /etc/netns/oc-ha2 /etc/netns/oc-hb /etc/netns/oc-hb2
  exit 0
fi
MODE=${2:-cone}
for n in $NS; do ip netns add $n; ip -n $n link set lo up; done

lien(){ # lien nsA ifA ipA nsB ifB ipB
  ip link add $2 type veth peer name $5
  ip link set $2 netns $1; ip link set $5 netns $4
  [ -n "$3" ] && ip -n $1 addr add $3 dev $2
  [ -n "$6" ] && ip -n $4 addr add $6 dev $5
  ip -n $1 link set $2 up; ip -n $4 link set $5 up
}
# l'Internet et ses deux abonnés
lien oc-inet i-ra 100.64.1.1/24 oc-ra ra-wan 100.64.1.2/24
lien oc-inet i-rb 100.64.2.1/24 oc-rb rb-wan 100.64.2.2/24

ip -n oc-inet addr add 100.64.9.1/32 dev lo

ip netns exec oc-inet sysctl -qw net.ipv4.ip_forward=1

# deux box, le MÊME plan d'adresses privé (comme deux maisons)
for r in a b; do
  ip -n oc-r$r link add br-$r type bridge
  ip -n oc-r$r addr add 192.168.1.1/24 dev br-$r
  ip -n oc-r$r link set br-$r up
  ip netns exec oc-r$r sysctl -qw net.ipv4.ip_forward=1
done
ip -n oc-ra route add default via 100.64.1.1
ip -n oc-rb route add default via 100.64.2.1

appareil(){ # appareil ns box ip
  lien oc-r$2 l-${1#oc-} "" $1 e-${1#oc-} $3/24
  ip -n oc-r$2 link set l-${1#oc-} master br-$2
  ip -n $1 route add default via 192.168.1.1
}
appareil oc-ha a 192.168.1.10
appareil oc-ha2 a 192.168.1.11
appareil oc-hb b 192.168.1.10
appareil oc-hb2 b 192.168.1.11

# le NAT des box. « cone » = une box domestique ordinaire (le port
# extérieur est gardé d'une destination à l'autre, seules les réponses
# entrent). « symetrique » = un port NEUF par destination, le cas d'une
# partie des opérateurs mobiles — là, seul un TURN passe.
for r in a b; do
  if [ "$MODE" = symetrique ]; then
    ip netns exec oc-r$r iptables -t nat -A POSTROUTING -o r$r-wan -j MASQUERADE --random-fully
  else
    ip netns exec oc-r$r iptables -t nat -A POSTROUTING -o r$r-wan -j MASQUERADE
  fi
  # le pare-feu de toute box : ce qui entre sans avoir été sollicité est
  # JETÉ, pas « refusé ». Sans lui, le noyau garde une trace du paquet
  # entrant et la box change ensuite de port — un NAT plus hostile que
  # celui d'une vraie box, qui fausserait le labo dans le sens pessimiste.
  ip netns exec oc-r$r iptables -A INPUT -i r$r-wan -m conntrack --ctstate NEW -j DROP
  ip netns exec oc-r$r iptables -A FORWARD -i r$r-wan -m conntrack --ctstate NEW -j DROP
done

# les noms des STUN de Trystero pointent vers le STUN du labo
for h in oc-ha oc-ha2 oc-hb oc-hb2; do
  mkdir -p /etc/netns/$h
  { echo "127.0.0.1 localhost"
    for s in stun.l.google.com stun1.l.google.com stun2.l.google.com stun.cloudflare.com; do
      echo "100.64.9.1 $s"; done; } > /etc/netns/$h/hosts
done
echo "labo prêt ($MODE)"
