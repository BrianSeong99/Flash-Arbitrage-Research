const { ethers: eth } = require("ethers");

const PERMIT_TYPEHASH = eth.utils.keccak256(
    eth.utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

function expandTo18Decimals(n) {
    return eth.BigNumber.from(n).mul(eth.BigNumber.from(10).pow(18))
}

function getDomainSeparator(name, tokenAddress) {
    return eth.utils.keccak256(
        eth.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
                eth.utils.keccak256(eth.utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
                eth.utils.keccak256(eth.utils.toUtf8Bytes(name)),
                eth.utils.keccak256(eth.utils.toUtf8Bytes('1')),
                1,
                tokenAddress
            ]
        )
    )
}

function getCreate2Address(
    factoryAddress,
    [tokenA, tokenB],
    bytecode
) {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const create2Inputs = [
        '0xff',
        factoryAddress,
        eth.utils.keccak256(eth.utils.solidityPack(['address', 'address'], [token0, token1])),
        eth.utils.keccak256(bytecode)
    ]
    const sanitizedInputs = `0x${create2Inputs.map(i => i.slice(2)).join('')}`
    return getAddress(`0x${eth.utils.keccak256(sanitizedInputs).slice(-40)}`)
}

/**
 * 
 * @param {*} token 
 * @param { owner: string
            spender: string
            value: BigNumber
        } approve
 * @param {BigNumber} nonce 
 * @param {BigNumber} deadline 
 * @returns Promise<string>
 */
async function getApprovalDigest(
    token,
    approve,
    nonce,
    deadline
) {
    const name = await token.name()
    const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
    return eth.utils.keccak256(
        eth.utils.solidityPack(
            ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
            [
                '0x19',
                '0x01',
                DOMAIN_SEPARATOR,
                eth.utils.keccak256(
                    eth.utils.defaultAbiCoder.encode(
                        ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                        [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
                    )
                )
            ]
        )
    )
}

/**
 * 
 * @param {Web3Provider} provider 
 * @param {number} timestamp 
 */
async function mineBlock(provider, timestamp) {
    await new Promise(async (resolve, reject) => {
        ; (provider._web3Provider.sendAsync)(
            { jsonrpc: '2.0', method: 'evm_mine', params: [timestamp] },
            (error, result) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(result)
                }
            }
        )
    })
}

/**
 * 
 * @param {BigNumber} reserve0 
 * @param {BigNumber} reserve1 
 * @returns 
 */
function encodePrice(reserve0, reserve1) {
    return [reserve1.mul(eth.BigNumber.from(2).pow(112)).div(reserve0), reserve0.mul(eth.BigNumber.from(2).pow(112)).div(reserve1)]
}

module.exports = { expandTo18Decimals, getCreate2Address, getApprovalDigest, mineBlock, encodePrice };