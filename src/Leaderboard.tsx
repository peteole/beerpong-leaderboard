import { useEffect, useReducer, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./client";
import { Button, Input, Loading, Table, Tooltip } from "@nextui-org/react";

function PlayerSelector({ players, onChange, label }: { players: Player[], onChange: (player: number) => void, label: string }) {
    return (
        <div>
            {label}
            <select onChange={e => onChange(parseInt(e.target.value))}>
                {players.map(player => (
                    <option key={player.id} value={player.id} >
                        {player.name}
                    </option>
                ))}
            </select>
        </div>
    )
}
type Player = { name: string, id: number }
type Match = { winner1: Player, winner2: Player, loser1: Player, loser2: Player, inserted_at: string, id: number }

export default function Leaderboard() {
    const [players, setPlayers] = useState<Player[]>([])
    const [playerName, setPlayerName] = useState("")
    const [m, setMatches] = useState<Match[]>([])
    const [name, setName] = useState("")
    const id = useParams().id || 0;
    const [isLoading, setIsLoading] = useState(true)
    const [version, increase] = useReducer((s) => {
        return s + 1
    }, 0)



    useEffect(() => {
        supabase.from<{ name: string, players: Player[], matches: Match[], id: number }>('leaderboards').select(`
            name,
            players(name,id),
            matches(winner1(name,id),winner2(name,id),loser1(name,id),loser2(name,id),id,inserted_at)
        `).eq('id', id).then(leaderboard => {
            console.log(leaderboard)
            if (!leaderboard?.data?.length) return
            setName(leaderboard.data[0].name)
            setPlayers(leaderboard.data[0].players)
            setMatches(leaderboard.data[0].matches)
            setWinner1(leaderboard.data[0].players[0].id)
            setWinner2(leaderboard.data[0].players[0].id)
            setLoser1(leaderboard.data[0].players[0].id)
            setLoser2(leaderboard.data[0].players[0].id)
            setIsLoading(false)
            //setPlayers(leaderboard?.data)
        })
    }, [version])


    const [winner1, setWinner1] = useState(1)
    const [winner2, setWinner2] = useState(1)
    const [loser1, setLoser1] = useState(1)
    const [loser2, setLoser2] = useState(1)
    if (isLoading)
        return <Loading size="md" />
    const scores = new Map<number, number>(players.map(p => [p.id, 1000]))
    const matches = m.map(m => ({ ...m, inserted_at: new Date(m.inserted_at) }))
    matches.sort((b, a) => (a.inserted_at).getTime() - (b.inserted_at).getTime())
    const matchScores: number[] = []
    //console.log(scores)
    for (const match of matches) {
        //console.log(match)
        const winner1Score = scores.get(match.winner1.id) || 1000
        const winner2Score = scores.get(match.winner2.id) || 1000
        const loser1Score = scores.get(match.loser1.id) || 1000
        const loser2Score = scores.get(match.loser2.id) || 1000
        const scoreDiff = ((winner1Score - loser1Score) + (winner2Score - loser2Score)) / 2
        const winProbability = 1 / (1 + Math.pow(10, -scoreDiff / 400))
        const update = 30 * (1 - winProbability)
        matchScores.push(update)
        scores.set(match.winner1.id, winner1Score + update)
        scores.set(match.winner2.id, winner2Score + update)
        scores.set(match.loser1.id, loser1Score - update)
        scores.set(match.loser2.id, loser2Score - update)
    }

    players.sort((a, b) => (scores.get(b.id) || 1000) - (scores.get(a.id) || 1000))

    return (
        <div>
            <h1>Leaderboard {name}</h1>
            <h2>Players:</h2>
            <Table
                aria-label="Players"
                css={{
                    height: "auto",
                    minWidth: "100%",
                }}>
                <Table.Header>
                    <Table.Column>Name</Table.Column>
                    <Table.Column>Score</Table.Column>
                    <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                    {players.map((p) => (
                        <Table.Row>
                            <Table.Cell>{p.name}</Table.Cell>
                            <Table.Cell>{Math.round(scores.get(p.id) || 1000)}</Table.Cell>
                            <Table.Cell>
                                <Tooltip
                                    content="Delete player"
                                    color="error"
                                    onClick={async () => {
                                        await supabase.from('players').delete().eq('id', p.id)
                                        increase()
                                    }}
                                >
                                    <IconButton>
                                        <DeleteIcon size={20} fill="#FF0080" />
                                    </IconButton>
                                </Tooltip>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <p>
                <Input onChange={e => setPlayerName(e.target.value)} placeholder="New player name" />
                <Button onClick={async () => {
                    await supabase.from("players").insert({ name: playerName, leaderboard: id })
                    increase()
                }}>Add Player</Button>
            </p>
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
                increase()
            }}>Add match</button>
            <h2>Matches</h2>
            <Table
                aria-label="Example table with static content"
                css={{
                    height: "auto",
                    minWidth: "100%",
                }}>
                <Table.Header>
                    <Table.Column>Winners</Table.Column>
                    <Table.Column>Losers</Table.Column>
                    <Table.Column>Date</Table.Column>
                    <Table.Column>Score</Table.Column>
                    <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                    {matches.map((match, i) => (
                        <Table.Row>
                            <Table.Cell>{match.winner1.name}, {match.winner2.name}</Table.Cell>
                            <Table.Cell>{match.loser1.name}, {match.loser2.name}</Table.Cell>
                            <Table.Cell>{match.inserted_at.toLocaleDateString()}</Table.Cell>
                            <Table.Cell>{Math.round(matchScores[i])}</Table.Cell>
                            <Table.Cell>
                                <Tooltip
                                    content="Delete match"
                                    color="error"
                                    onClick={async () => {
                                        await supabase.from('matches').delete().eq('id', match.id)
                                    }}
                                >
                                    <IconButton>
                                        <DeleteIcon size={20} fill="#FF0080" />
                                    </IconButton>
                                </Tooltip>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    )
}

import { styled } from '@nextui-org/react';

// IconButton component will be available as part of the core library soon
export const IconButton = styled('button', {
    dflex: 'center',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    bg: 'transparent',
    transition: '$default',
    '&:hover': {
        opacity: '0.8'
    },
    '&:active': {
        opacity: '0.6'
    }
});
type IconProps = {
    fill?: string;
    size?: string | number;
    height?: string | number;
    width?: string | number;
    label?: string;
}

export const DeleteIcon: React.FC<IconProps> = ({
    fill,
    size,
    height,
    width,
    ...props
}) => {
    return (
        <svg
            width={size || width || 24}
            height={size || height || 24}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M17.5 4.98332C14.725 4.70832 11.9333 4.56665 9.15 4.56665C7.5 4.56665 5.85 4.64998 4.2 4.81665L2.5 4.98332"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.08331 4.14169L7.26665 3.05002C7.39998 2.25835 7.49998 1.66669 8.90831 1.66669H11.0916C12.5 1.66669 12.6083 2.29169 12.7333 3.05835L12.9166 4.14169"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15.7084 7.61664L15.1667 16.0083C15.075 17.3166 15 18.3333 12.675 18.3333H7.32502C5.00002 18.3333 4.92502 17.3166 4.83335 16.0083L4.29169 7.61664"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M8.60834 13.75H11.3833"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.91669 10.4167H12.0834"
                stroke={fill}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
