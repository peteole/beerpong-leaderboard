import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./client";

function PlayerSelector({ players, onChange, label }) {
    return (
        <div>
            {label}
            <select onChange={e => onChange(e.target.value)}>
                {players.map(player => (
                    <option key={player.id} value={player.id} >
                        {player.name}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default function Leaderboard() {
    const [players, setPlayers] = useState([])
    const [playerName, setPlayerName] = useState("")
    const [matches, setMatches] = useState([])
    const [name, setName] = useState("")
    const id = useParams().id;




    useEffect(() => {
        supabase.from('leaderboards').select(`
            name,
            players(name,id),
            matches(winner1(name,id),winner2(name,id),loser1(name,id),loser2(name,id),id,inserted_at)
        `).eq('id', id).then(leaderboard => {
            console.log(leaderboard)
            setName(leaderboard.data[0].name)
            setPlayers(leaderboard.data[0].players)
            setMatches(leaderboard.data[0].matches)
            //setPlayers(leaderboard?.data)
        })
    }, [])

    const [winner1, setWinner1] = useState(1)
    const [winner2, setWinner2] = useState(1)
    const [loser1, setLoser1] = useState(1)
    const [loser2, setLoser2] = useState(1)
    const scores=new Map<number,number>(players.map(p=>[p.id,1000]))
    //console.log(scores)
    for(const match of matches.sort((a, b) => new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime())){
        //console.log(match)
        const scoreDiff=(scores.get(match.winner1.id)+scores.get(match.winner2.id)-scores.get(match.loser1.id)-scores.get(match.loser2.id))/2
        const winnProbability=1/(1+Math.pow(10,-scoreDiff/400))
        console.log(winnProbability)
        const update=30*(1-winnProbability)
        scores.set(match.winner1.id,scores.get(match.winner1.id)+30*(1-winnProbability))
        scores.set(match.winner2.id,scores.get(match.winner2.id)+30*(1-winnProbability))
        scores.set(match.loser1.id,scores.get(match.loser1.id)-30*winnProbability)
        scores.set(match.loser2.id,scores.get(match.loser2.id)-30*winnProbability)
        console.log(scoreDiff)
    }


    return (
        <div>
            <h1>Leaderboard {name}</h1>
            <h2>Players:</h2>
            {
                players.map(player => (
                    <p>{player.name}:{scores.get(player.id)}</p>
                )
                )
            }
            <input onChange={e => setPlayerName(e.target.value)} />
            <button onClick={async () => {
                await supabase.from("players").insert({ name: playerName, leaderboard: id })
            }}>Add Player</button>
            <h2>Matches</h2>
            {matches.map(match => (<p>
                {match.winner1.name} + {match.winner2.name} win against {match.loser1.name} + {match.loser2.name}
                <button onClick={async () => {
                    await supabase.from('matches').delete().eq('id', match.id)
                }}>delete</button>
            </p>))}
            <h2>Add match</h2>
            <PlayerSelector label={"winner1 "} players={players} onChange={e => setWinner1(e)} />
            <PlayerSelector label={"winner2 "} players={players} onChange={e => setWinner2(e)} />
            <PlayerSelector label={"loser1 "} players={players} onChange={e => setLoser1(e)} />
            <PlayerSelector label={"loser2 "} players={players} onChange={e => setLoser2(e)} />
            <button onClick={async () => {
                await supabase.from("matches").insert({
                    winner1: winner1,
                    winner2: winner2,
                    loser1: loser1,
                    loser2: loser2,
                    leaderboard: id
                }
                )
            }}>Add match</button>
        </div>
    )
}

